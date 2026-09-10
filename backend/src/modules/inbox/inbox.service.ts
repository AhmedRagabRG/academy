import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ConversationAiState,
  Prisma,
} from '../../../prisma/generated/client';
import {
  DomainException,
  NotFoundException,
  VersionConflictException,
} from '../../core/exceptions';
import type { CallerContext } from '../../shared/types/caller-context';
import {
  STORAGE_SERVICE,
  type StorageService,
  type UploadedFile,
} from '../../storage/storage.service.interface';
import type {
  AiControlDto,
  AssignmentDto,
  InboxListDto,
  ReplyDto,
} from './dto/inbox.dto';
import {
  INBOX_DELIVERY_PORT,
  type InboxDeliveryPort,
} from './delivery/inbox-delivery.port';
import { InboxCrmLinkService } from './crm/inbox-crm-link.service';
import { InboxRealtimeService } from './inbox-realtime.service';
import { InboxPolicy } from './inbox.policy';
import { InboxRepository } from './inbox.repository';

const statusWire = (value: string) => value.toLowerCase();
const statusDb = (value: string) =>
  value.toUpperCase() as 'OPEN' | 'PENDING' | 'SNOOZED' | 'CLOSED' | 'ARCHIVED';
const labels: Record<string, string> = {
  open: 'مفتوحة',
  pending: 'معلّقة',
  snoozed: 'مؤجلة',
  closed: 'مغلقة',
  archived: 'مؤرشفة',
};
const aggregateInclude = {
  customer: true,
  platform: true,
  assignedEmployee: true,
  assignedTeam: true,
  tags: { include: { tag: true } },
  messages: {
    include: { attachments: true },
    orderBy: [{ sentAt: 'asc' as const }, { id: 'asc' as const }],
  },
  notes: { orderBy: { createdAt: 'asc' as const } },
  assignmentHistory: { orderBy: { occurredAt: 'asc' as const } },
  systemEvents: { orderBy: { occurredAt: 'asc' as const } },
  aiState: true,
} satisfies Prisma.InboxConversationInclude;
type Aggregate = Prisma.InboxConversationGetPayload<{
  include: typeof aggregateInclude;
}>;

/**
 * Who wrote an outbound message. A closed union, and the AI branch deliberately
 * carries no CallerContext: there is no synthetic caller to fabricate, so no
 * permission check can be bypassed by constructing one. The AI's authority comes
 * from its own restricted service account at the point it calls a domain service,
 * never from an impersonated context here.
 */
type OutboundAuthor =
  | { kind: 'human'; caller: CallerContext }
  | {
      kind: 'ai';
      agentId: string;
      serviceAccountId: string;
      agentDisplayName: string;
      aiTurnId: string;
    };

/** Raised when a human took over before the AI's reply could be committed. */
export class AiTurnSuppressed extends Error {
  constructor(readonly stage: 'commit' | 'dispatch') {
    super(`AI turn suppressed at ${stage}`);
    this.name = 'AiTurnSuppressed';
  }
}

@Injectable()
export class InboxService {
  private readonly attachmentTtlMs = 60 * 60 * 1000;
  constructor(
    private readonly repo: InboxRepository,
    private readonly policy: InboxPolicy,
    @Inject(INBOX_DELIVERY_PORT) private readonly delivery: InboxDeliveryPort,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    private readonly crm: InboxCrmLinkService,
    private readonly realtime: InboxRealtimeService,
  ) {}
  private event(
    c: CallerContext,
    type: string,
    label: string,
    payload?: Prisma.InputJsonValue,
  ) {
    return this.actorEvent(c.accountId, c.displayName, type, label, payload);
  }
  private actorEvent(
    actorId: string,
    actorName: string,
    type: string,
    label: string,
    payload?: Prisma.InputJsonValue,
  ) {
    return { type, label, actorId, actorName, payload };
  }
  private aiProjection(state: ConversationAiState, agentEnabled: boolean) {
    return {
      mode: state.mode.toLowerCase(),
      pausedReason: state.pausedReason?.toLowerCase().replaceAll('_', '-'),
      pausedAt: state.pausedAt?.toISOString() ?? null,
      resumeAt: state.resumeAt?.toISOString() ?? null,
      agentEnabled,
      version: state.version,
    };
  }
  private async isAgentEnabled(state: ConversationAiState): Promise<boolean> {
    return (
      (
        await this.repo.db.aiAgent.findUnique({
          where: { id: state.agentId },
          select: { enabled: true },
        })
      )?.enabled ?? false
    );
  }
  private project(row: Aggregate, agentEnabled = false) {
    return {
      id: row.id,
      customerId: row.customerId,
      platformId: row.platformId,
      status: statusWire(row.status),
      assignedEmployeeId: row.assignedEmployeeId,
      assignedTeamId: row.assignedTeamId,
      tagIds: row.tags.map((x) => x.tagId),
      unreadCount: row.unreadCount,
      lastMessage: row.lastMessage,
      lastActivityAt: row.lastActivityAt.toISOString(),
      version: row.version,
      deletedAt: row.deletedAt?.toISOString(),
      previousStatus: row.previousStatus
        ? statusWire(row.previousStatus)
        : undefined,
      ai: row.aiState ? this.aiProjection(row.aiState, agentEnabled) : null,
      customer: {
        id: row.customer.id,
        name: row.customer.name,
        phone: row.customer.phone,
        avatarUrl: row.customer.avatarUrl ?? undefined,
        firstContactAt: row.customer.firstContactAt.toISOString(),
        lastActivityAt: row.customer.lastActivityAt.toISOString(),
      },
      platform: {
        id: row.platform.id,
        label: row.platform.label,
        icon: row.platform.icon,
        active: row.platform.active,
      },
      employee: row.assignedEmployee
        ? {
            id: row.assignedEmployee.id,
            label: row.assignedEmployee.displayName,
            active: row.assignedEmployee.status === 'ACTIVE',
            teamIds: [],
          }
        : null,
      team: row.assignedTeam
        ? {
            id: row.assignedTeam.id,
            label: row.assignedTeam.name,
            active: row.assignedTeam.active,
          }
        : null,
      tags: row.tags.map(({ tag }) => ({
        id: tag.id,
        label: tag.label,
        color: tag.color,
        active: tag.active,
      })),
      messages: row.messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        direction: m.direction.toLowerCase(),
        authorType: m.authorType.toLowerCase().replace('_', '-'),
        senderName: m.senderName,
        body: m.body,
        sentAt: m.sentAt.toISOString(),
        delivery: m.delivery.toLowerCase(),
        attachments: m.attachments.map((a) => ({
          id: a.sourceId,
          kind: a.kind,
          fileName: a.fileName,
          sizeBytes: a.sizeBytes ?? undefined,
          durationSeconds: a.durationSeconds ?? undefined,
          // Inbound provider attachments have no locally stored bytes: the
          // server preserves the real media reference without fabricating a
          // downloadable file, so the UI marks them preview-only.
          placeholder: a.storageKey === null,
        })),
      })),
      notes: row.notes.map((n) => ({
        id: n.id,
        conversationId: n.conversationId,
        authorEmployeeId: n.authorEmployeeId,
        authorName: n.authorName,
        content: n.content,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt?.toISOString(),
      })),
      assignmentHistory: row.assignmentHistory.map((h) => ({
        id: h.id,
        conversationId: h.conversationId,
        previous: {
          employeeId: h.previousEmployeeId,
          teamId: h.previousTeamId,
        },
        next: { employeeId: h.nextEmployeeId, teamId: h.nextTeamId },
        actorName: h.actorName,
        occurredAt: h.occurredAt.toISOString(),
      })),
      systemEvents: row.systemEvents.map((e) => ({
        id: e.id,
        conversationId: e.conversationId,
        type: e.type,
        label: e.label,
        actorName: e.actorName,
        occurredAt: e.occurredAt.toISOString(),
      })),
    };
  }
  private async projectWithAi(row: Aggregate) {
    return this.project(
      row,
      row.aiState ? await this.isAgentEnabled(row.aiState) : false,
    );
  }
  private async full(c: CallerContext, id: string, includeDeleted = false) {
    const visible = await this.repo.visible(c, id, includeDeleted);
    this.policy.assertVisible(visible);
    const row = await this.repo.db.inboxConversation.findUnique({
      where: { id },
      include: aggregateInclude,
    });
    this.policy.assertVisible(row);
    return row;
  }
  private assertMutable(row: { status: string; deletedAt: Date | null }) {
    if (row.deletedAt || row.status === 'ARCHIVED')
      throw new DomainException(
        'conversation-not-mutable',
        'لا يمكن تعديل محادثة مؤرشفة أو محذوفة',
        409,
      );
  }
  private filters(
    c: CallerContext,
    q: InboxListDto,
    teamIds: string[],
  ): Prisma.InboxConversationWhereInput {
    const search = q.search.trim();
    const view: Prisma.InboxConversationWhereInput =
      q.view === 'assigned'
        ? { assignedEmployeeId: c.accountId }
        : q.view === 'team'
          ? { assignedTeamId: { in: teamIds } }
          : q.view === 'unassigned'
            ? { assignedEmployeeId: null, assignedTeamId: null }
            : q.view === 'closed'
              ? { status: 'CLOSED' }
              : q.view === 'archived'
                ? { status: 'ARCHIVED' }
                : {};
    return {
      AND: [
        view,
        q.unreadOnly ? { unreadCount: { gt: 0 } } : {},
        q.platforms.length ? { platformId: { in: q.platforms } } : {},
        q.statuses.length ? { status: { in: q.statuses.map(statusDb) } } : {},
        q.employeeIds.length
          ? { assignedEmployeeId: { in: q.employeeIds } }
          : {},
        q.teamIds.length ? { assignedTeamId: { in: q.teamIds } } : {},
        q.tagIds.length ? { tags: { some: { tagId: { in: q.tagIds } } } } : {},
        search
          ? {
              OR: [
                {
                  customer: { name: { contains: search, mode: 'insensitive' } },
                },
                { customer: { phone: { contains: search } } },
                { lastMessage: { contains: search, mode: 'insensitive' } },
                {
                  tags: {
                    some: {
                      tag: { label: { contains: search, mode: 'insensitive' } },
                    },
                  },
                },
              ],
            }
          : {},
      ],
    };
  }
  async list(c: CallerContext, q: InboxListDto) {
    const org = await this.repo.organizationId();
    const teamIds = await this.repo.teamIds(c);
    const scope = this.policy.scope(c, teamIds);
    const fingerprint = this.repo.fingerprint(q);
    const cursor = this.repo.decode(q.cursor, fingerprint);
    const snapshotAt = cursor?.snapshotAt ?? new Date().toISOString();
    const base: Prisma.InboxConversationWhereInput = {
      organizationId: org,
      deletedAt: null,
      createdAt: { lte: new Date(snapshotAt) },
      AND: [scope, this.filters(c, q, teamIds)],
    };
    const orderBy: Prisma.InboxConversationOrderByWithRelationInput[] =
      q.sort === 'oldest'
        ? [{ lastActivityAt: 'asc' }, { id: 'asc' }]
        : q.sort === 'unread'
          ? [
              { unreadCount: 'desc' },
              { lastActivityAt: 'desc' },
              { id: 'desc' },
            ]
          : [{ lastActivityAt: 'desc' }, { id: 'desc' }];
    const [rows, total] = await Promise.all([
      this.repo.db.inboxConversation.findMany({
        where: { AND: [base, this.repo.cursorWhere(q, cursor)] },
        include: aggregateInclude,
        orderBy,
        take: q.limit + 1,
      }),
      this.repo.db.inboxConversation.count({ where: base }),
    ]);
    const hasMore = rows.length > q.limit;
    const items = rows.slice(0, q.limit);
    const last = items.at(-1);
    return {
      items: await Promise.all(items.map((x) => this.projectWithAi(x))),
      total,
      nextCursor:
        hasMore && last
          ? this.repo.encode({
              v: 1,
              fingerprint,
              id: last.id,
              snapshotAt,
              lastActivityAt: last.lastActivityAt.toISOString(),
              unreadCount: last.unreadCount,
            })
          : null,
    };
  }
  async detail(c: CallerContext, id: string) {
    const row = await this.full(c, id);
    return {
      ...(await this.projectWithAi(row)),
      crm: await this.crm.summary(row.customerId),
    };
  }
  async getAiState(c: CallerContext, conversationId: string) {
    const row = await this.full(c, conversationId);
    if (!row.aiState) return null;
    const state = this.aiProjection(
      row.aiState,
      await this.isAgentEnabled(row.aiState),
    );
    return {
      mode: state.mode,
      pausedReason: state.pausedReason,
      pausedAt: state.pausedAt,
      resumeAt: state.resumeAt,
      agentEnabled: state.agentEnabled,
    };
  }
  async setAiMode(c: CallerContext, conversationId: string, dto: AiControlDto) {
    this.policy.assert(c, 'inbox.ai.control');
    const visible = await this.full(c, conversationId);
    const state = visible.aiState;
    if (!state) throw new NotFoundException();
    if (state.version !== dto.expectedVersion)
      throw new VersionConflictException(state.version);

    const now = new Date();
    const updated = await this.repo.db.$transaction(async (tx) => {
      const result = await tx.conversationAiState.updateMany({
        where: { conversationId, version: dto.expectedVersion },
        data:
          dto.action === 'pause'
            ? {
                mode: 'PAUSED',
                pausedReason: 'MANUAL',
                pausedAt: now,
                pausedByAccountId: c.accountId,
                resumeAt: null,
                version: { increment: 1 },
              }
            : {
                mode: 'AUTO',
                pausedReason: null,
                pausedAt: null,
                pausedByAccountId: null,
                resumeAt: null,
                turnSeq: { increment: 1 },
                version: { increment: 1 },
              },
      });
      if (result.count !== 1) {
        const current = await tx.conversationAiState.findUnique({
          where: { conversationId },
          select: { version: true },
        });
        throw new VersionConflictException(
          current?.version ?? dto.expectedVersion,
        );
      }
      await tx.inboxSystemEvent.create({
        data: {
          conversationId,
          ...this.event(
            c,
            dto.action === 'pause' ? 'ai.paused.manual' : 'ai.resumed',
            dto.action === 'pause'
              ? 'أُوقف المساعد الذكي مؤقتًا'
              : 'استؤنف المساعد الذكي',
          ),
        },
      });
      return tx.conversationAiState.findUniqueOrThrow({
        where: { conversationId },
      });
    });
    this.realtime.publish();
    return this.aiProjection(updated, await this.isAgentEnabled(updated));
  }
  async markRead(c: CallerContext, id: string) {
    const current = await this.full(c, id);
    const incoming = [...current.messages]
      .reverse()
      .find((message) => message.direction === 'INCOMING');
    await this.delivery.markRead({
      organizationId: current.organizationId,
      platformCode: current.platform.code,
      recipientId: current.providerThreadId ?? current.customer.normalizedPhone,
      providerMessageId: incoming?.providerMessageId ?? undefined,
    });
    if (current.unreadCount)
      await this.repo.db.inboxConversation.update({
        where: { id },
        data: { unreadCount: 0, version: { increment: 1 } },
      });
    return this.projectWithAi(await this.full(c, id));
  }
  async dashboard(c: CallerContext, q: InboxListDto) {
    const org = await this.repo.organizationId();
    const teamIds = await this.repo.teamIds(c);
    const base = {
      organizationId: org,
      deletedAt: null,
      AND: [this.policy.scope(c, teamIds), this.filters(c, q, teamIds)],
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [assigned, open, pending, unread, closedToday] = await Promise.all([
      this.repo.db.inboxConversation.count({
        where: { ...base, assignedEmployeeId: c.accountId },
      }),
      this.repo.db.inboxConversation.count({
        where: { ...base, status: 'OPEN' },
      }),
      this.repo.db.inboxConversation.count({
        where: { ...base, status: 'PENDING' },
      }),
      this.repo.db.inboxConversation.count({
        where: { ...base, unreadCount: { gt: 0 } },
      }),
      this.repo.db.inboxConversation.count({
        where: { ...base, status: 'CLOSED', closedAt: { gte: today } },
      }),
    ]);
    return { assigned, open, pending, unread, closedToday };
  }
  async lookups(c: CallerContext) {
    this.policy.assertAnyView(c);
    const org = await this.repo.organizationId();
    const [platforms, tags, teams, employees] = await Promise.all([
      this.repo.db.inboxPlatform.findMany({
        where: { organizationId: org, active: true },
      }),
      this.repo.db.inboxTag.findMany({
        where: { organizationId: org, active: true },
      }),
      this.repo.db.ticketTeam.findMany({
        where: { organizationId: org, active: true },
      }),
      this.repo.db.account.findMany({
        where: {
          status: 'ACTIVE',
        },
      }),
    ]);
    const memberships = await this.repo.db.ticketTeamMembership.findMany({
      where: {
        active: true,
        teamId: { in: teams.map((x) => x.id) },
        employeeId: { in: employees.map((x) => x.id) },
      },
    });
    return {
      // `code` is the stable channel key ('whatsapp', 'messenger', ...). The id
      // is what inbox filters use, but anything configuring behaviour per
      // channel — the AI agent's enabled channels, for one — must key off the
      // code, because that is what the conversation carries at runtime.
      platforms: platforms.map((x) => ({
        id: x.id,
        code: x.code,
        label: x.label,
      })),
      statuses: Object.entries(labels).map(([id, label]) => ({ id, label })),
      tags: tags.map((x) => ({ id: x.id, label: x.label, color: x.color })),
      teams: teams.map((x) => ({ id: x.id, label: x.name })),
      employees: employees.map((x) => ({
        id: x.id,
        label: x.displayName,
        teamIds: memberships
          .filter((m) => m.employeeId === x.id)
          .map((m) => m.teamId),
      })),
    };
  }
  async stageAttachment(c: CallerContext, file: UploadedFile) {
    this.policy.assert(c, 'inbox.reply');
    if (!file) throw new DomainException('file-required', 'الملف مطلوب', 422);
    const organizationId = await this.repo.organizationId();
    const stored = await this.storage.store(file, 'inbox-attachment');
    const kind = stored.mimeType.startsWith('image/')
      ? 'image'
      : stored.mimeType === 'application/pdf'
        ? 'pdf'
        : 'document';
    try {
      const row = await this.repo.db.inboxStagedAttachment.create({
        data: {
          organizationId,
          ownerAccountId: c.accountId,
          kind,
          fileName: stored.originalName,
          mimeType: stored.mimeType,
          sizeBytes: stored.size,
          storageId: stored.id,
          storageName: stored.fileName,
          expiresAt: new Date(Date.now() + this.attachmentTtlMs),
        },
      });
      return {
        id: row.id,
        kind: row.kind,
        fileName: row.fileName,
        sizeBytes: row.sizeBytes,
      };
    } catch (error) {
      await this.storage.remove(stored.fileName);
      throw error;
    }
  }
  /**
   * The single place an outbound InboxMessage row is written. Both the human
   * reply path and the AI path go through it, so the message shape, the
   * conversation counters and the system-event trail cannot drift apart.
   *
   * Must be called inside a transaction. For a human author it also pauses the
   * AI in that same transaction: a post-commit listener would lose the pause if
   * the process died in between, and the AI would then reply on top of the human.
   */
  private async persistOutbound(
    tx: Prisma.TransactionClient,
    conversationId: string,
    input: {
      messageId: string;
      body: string;
      sentAt: Date;
      retryToken: string;
      author: OutboundAuthor;
      lastMessage: string;
      attachments?: Prisma.InboxMessageAttachmentCreateWithoutMessageInput[];
    },
  ) {
    const author = input.author;
    const created = await tx.inboxMessage.create({
      data: {
        id: input.messageId,
        conversationId,
        direction: 'OUTGOING',
        authorType: author.kind === 'human' ? 'HUMAN_AGENT' : 'AI_AGENT',
        senderName:
          author.kind === 'human'
            ? author.caller.displayName
            : author.agentDisplayName,
        body: input.body,
        sentAt: input.sentAt,
        delivery: 'QUEUED',
        retryToken: input.retryToken,
        createdBy:
          author.kind === 'human'
            ? author.caller.accountId
            : author.serviceAccountId,
        ...(author.kind === 'ai' ? { aiTurnId: author.aiTurnId } : {}),
        ...(input.attachments?.length
          ? { attachments: { create: input.attachments } }
          : {}),
      },
    });
    await tx.inboxConversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: input.lastMessage,
        lastActivityAt: input.sentAt,
        // Only a human replying implies a human read the thread. An AI reply
        // must not clear the badge, or an inbound message arriving alongside it
        // would be silently marked as seen by nobody.
        ...(author.kind === 'human' ? { unreadCount: 0 } : {}),
        version: { increment: 1 },
        systemEvents: {
          create:
            author.kind === 'human'
              ? this.event(author.caller, 'reply.sent', 'تم إرسال رد', {
                  messageId: created.id,
                })
              : this.actorEvent(
                  author.serviceAccountId,
                  author.agentDisplayName,
                  'ai.reply.sent',
                  'رد المساعد الذكي',
                  { messageId: created.id, aiTurnId: author.aiTurnId },
                ),
        },
      },
    });
    if (author.kind === 'human')
      await this.pauseAiForHuman(tx, conversationId, author.caller);
    return created;
  }
  /**
   * Hard requirement: this runs inside the human reply's own transaction, so a
   * rollback takes the pause with it and a crash can never leave the AI live on
   * a conversation a human has entered.
   *
   * One statement, so the resume deadline is computed from the agent's setting
   * against Postgres's clock rather than the application's. A null
   * `resumeAfterMinutes` means never auto-resume. No state row -> no-op.
   */
  private async pauseAiForHuman(
    tx: Prisma.TransactionClient,
    conversationId: string,
    c: CallerContext,
  ) {
    await tx.$executeRaw`
      UPDATE "ConversationAiState" s
      SET mode = 'PAUSED',
          "pausedReason" = 'HUMAN_REPLY',
          "pausedAt" = now(),
          "pausedByAccountId" = ${c.accountId}::uuid,
          "resumeAt" = CASE
            WHEN a."resumeAfterMinutes" IS NULL THEN NULL
            ELSE now() + (interval '1 minute' * a."resumeAfterMinutes")
          END,
          "turnSeq" = s."turnSeq" + 1,
          "version" = s."version" + 1,
          "updatedAt" = now()
      FROM "AiAgent" a
      WHERE s."conversationId" = ${conversationId}::uuid
        AND a.id = s."agentId"
        AND s.mode <> 'OFF'
    `;
  }
  async sendReply(c: CallerContext, id: string, dto: ReplyDto) {
    this.policy.assert(c, 'inbox.reply');
    const body = dto.body.trim();
    if (!body && !dto.attachments.length)
      throw new DomainException('validation', 'اكتب رسالة أو أضف مرفقًا', 422);
    const current = await this.full(c, id);
    this.assertMutable(current);
    const isMetaChannel = ['whatsapp', 'messenger', 'instagram'].includes(
      current.platform.code,
    );
    if (isMetaChannel && dto.attachments.length)
      throw new DomainException(
        'provider-attachment-not-supported',
        'إرسال المرفقات عبر Meta غير متاح بعد',
        422,
      );
    const message = await this.repo.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${id}:${dto.retryToken}`}, 0))`;
      const existing = await tx.inboxMessage.findUnique({
        where: {
          conversationId_retryToken: {
            conversationId: id,
            retryToken: dto.retryToken,
          },
        },
      });
      if (existing) return existing;
      const attachmentIds = dto.attachments.map((x) => x.id);
      if (new Set(attachmentIds).size !== attachmentIds.length)
        throw new DomainException(
          'attachment-invalid',
          'لا يمكن استخدام المرفق نفسه أكثر من مرة',
          422,
        );
      const sources = attachmentIds.length
        ? await tx.inboxStagedAttachment.findMany({
            where: {
              id: { in: attachmentIds },
              organizationId: current.organizationId,
              ownerAccountId: c.accountId,
              consumedAt: null,
              expiresAt: { gt: new Date() },
            },
          })
        : [];
      if (sources.length !== attachmentIds.length)
        throw new DomainException(
          'attachment-invalid',
          'المرفق منتهي أو غير متاح لهذا المستخدم',
          422,
        );
      const sourceById = new Map(sources.map((x) => [x.id, x]));
      for (const descriptor of dto.attachments) {
        const source = sourceById.get(descriptor.id);
        if (
          !source ||
          source.kind !== descriptor.kind ||
          source.fileName !== descriptor.fileName ||
          source.sizeBytes !== descriptor.sizeBytes
        )
          throw new DomainException(
            'attachment-mismatch',
            'بيانات المرفق لا تطابق الملف المرفوع',
            422,
          );
      }
      const sentAt = new Date();
      const messageId = randomUUID();
      if (attachmentIds.length) {
        const consumed = await tx.inboxStagedAttachment.updateMany({
          where: {
            id: { in: attachmentIds },
            organizationId: current.organizationId,
            ownerAccountId: c.accountId,
            consumedAt: null,
            expiresAt: { gt: sentAt },
          },
          data: { consumedAt: sentAt, consumedByMessageId: messageId },
        });
        if (consumed.count !== attachmentIds.length)
          throw new DomainException(
            'attachment-consumed',
            'تم استخدام أحد المرفقات بالفعل',
            409,
          );
      }
      return this.persistOutbound(tx, current.id, {
        messageId,
        body,
        sentAt,
        retryToken: dto.retryToken,
        author: { kind: 'human', caller: c },
        lastMessage: body || dto.attachments[0].fileName,
        attachments: dto.attachments.map((a) => ({
          sourceId: a.id,
          kind: a.kind,
          fileName: a.fileName,
          sizeBytes: a.sizeBytes,
          storageKey: sourceById.get(a.id)!.storageId,
          ownerAccountId: c.accountId,
          durationSeconds: a.durationSeconds,
        })),
      });
    });
    try {
      const result = await this.delivery.enqueue({
        organizationId: current.organizationId,
        conversationId: id,
        messageId: message.id,
        platformCode: current.platform.code,
        recipientId:
          current.providerThreadId ?? current.customer.normalizedPhone,
        body,
      });
      await this.repo.db.inboxMessage.update({
        where: { id: message.id },
        data: {
          delivery: result.state === 'sent' ? 'SENT' : 'QUEUED',
          providerMessageId: result.providerReference,
        },
      });
    } catch (error) {
      await this.repo.db.inboxMessage.update({
        where: { id: message.id },
        data: { delivery: 'FAILED' },
      });
      throw error;
    }
    return this.projectWithAi(await this.full(c, id));
  }
  /**
   * The AI's only way to speak. Deliberately takes no CallerContext, so it is
   * unreachable from any controller and cannot be driven by an HTTP request.
   *
   * Three independent guards stop it talking over a human, in order:
   *
   *  1. `retryToken` = `ai:<aiTurnId>`, stable across every BullMQ retry, against
   *     the existing @@unique([conversationId, retryToken]). A retry of a turn
   *     whose row already committed does NOT re-decide whether to speak — that
   *     decision was made and committed — it only re-attempts dispatch.
   *  2. The fencing guard, inside the same transaction as the insert. If
   *     `turnSeq` moved, nothing is written at all and the generated text is
   *     discarded unseen.
   *  3. The dispatch guard, one atomic statement immediately before the network
   *     call. The commit and the provider request cannot be atomic — putting a
   *     fetch inside a Postgres transaction is exactly what sendReply avoids —
   *     so this shrinks the residual window to roughly one statement. Losing it
   *     leaves the row SUPPRESSED rather than deleting it: an agent may already
   *     have seen it, and silently removing it would be dishonest.
   */
  async sendAiReply(input: {
    conversationId: string;
    agentId: string;
    serviceAccountId: string;
    agentDisplayName: string;
    aiTurnId: string;
    body: string;
    expectedTurnSeq: number;
  }): Promise<{
    status: 'sent' | 'suppressed' | 'failed';
    messageId?: string;
  }> {
    const body = input.body.trim();
    if (!body) throw new DomainException('validation', 'نص الرد مطلوب', 422);
    const conversation = await this.repo.forSystem(input.conversationId);
    if (!conversation) return { status: 'suppressed' };
    const retryToken = `ai:${input.aiTurnId}`;
    let message: { id: string } | null = null;
    try {
      message = await this.repo.db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`ai:${input.conversationId}`}, 0))`;
        const existing = await tx.inboxMessage.findUnique({
          where: {
            conversationId_retryToken: {
              conversationId: input.conversationId,
              retryToken,
            },
          },
          select: { id: true },
        });
        if (existing) return existing;
        const guard = await tx.conversationAiState.updateMany({
          where: {
            conversationId: input.conversationId,
            turnSeq: input.expectedTurnSeq,
            mode: 'AUTO',
            conversation: { deletedAt: null, status: { not: 'ARCHIVED' } },
          },
          data: { turnSeq: { increment: 1 } },
        });
        if (guard.count === 0) throw new AiTurnSuppressed('commit');
        return this.persistOutbound(tx, input.conversationId, {
          messageId: randomUUID(),
          body,
          sentAt: new Date(),
          retryToken,
          author: {
            kind: 'ai',
            agentId: input.agentId,
            serviceAccountId: input.serviceAccountId,
            agentDisplayName: input.agentDisplayName,
            aiTurnId: input.aiTurnId,
          },
          lastMessage: body,
        });
      });
    } catch (error) {
      if (error instanceof AiTurnSuppressed) {
        this.realtime.publish();
        return { status: 'suppressed' };
      }
      throw error;
    }
    const claimed = await this.claimAiDispatch(
      input.aiTurnId,
      input.conversationId,
      input.expectedTurnSeq + 1,
    );
    if (!claimed) {
      await this.repo.db.inboxMessage.update({
        where: { id: message.id },
        data: { delivery: 'SUPPRESSED' },
      });
      await this.repo.db.inboxSystemEvent.create({
        data: {
          conversationId: input.conversationId,
          ...this.actorEvent(
            input.serviceAccountId,
            input.agentDisplayName,
            'ai.reply.suppressed',
            'أُوقفت مسودة المساعد الذكي',
            { messageId: message.id, aiTurnId: input.aiTurnId },
          ),
        },
      });
      this.realtime.publish();
      return { status: 'suppressed', messageId: message.id };
    }
    try {
      const result = await this.delivery.enqueue({
        organizationId: conversation.organizationId,
        conversationId: input.conversationId,
        messageId: message.id,
        platformCode: conversation.platform.code,
        recipientId:
          conversation.providerThreadId ??
          conversation.customer.normalizedPhone,
        body,
      });
      await this.repo.db.inboxMessage.update({
        where: { id: message.id },
        data: {
          delivery: result.state === 'sent' ? 'SENT' : 'QUEUED',
          providerMessageId: result.providerReference,
        },
      });
      this.realtime.publish();
      return { status: 'sent', messageId: message.id };
    } catch {
      await this.repo.db.inboxMessage.update({
        where: { id: message.id },
        data: { delivery: 'FAILED' },
      });
      this.realtime.publish();
      return { status: 'failed', messageId: message.id };
    }
  }
  /**
   * Marks the turn as "the provider request is about to be issued", but only if
   * this turn still owns the conversation. Mirrors
   * CampaignDispatcherService.markRequestStarted: one statement whose row lock
   * also stops a concurrent retry double-sending. `dispatchStartedAt IS NULL`
   * is the point of no automatic return.
   */
  private async claimAiDispatch(
    aiTurnId: string,
    conversationId: string,
    turnSeq: number,
  ): Promise<boolean> {
    const rows = await this.repo.db.$queryRaw<Array<{ id: string }>>`
      UPDATE "AiTurn" t
      SET "dispatchStartedAt" = now()
      WHERE t.id = ${aiTurnId}::uuid
        AND t."dispatchStartedAt" IS NULL
        AND EXISTS (
          SELECT 1 FROM "ConversationAiState" s
          WHERE s."conversationId" = ${conversationId}::uuid
            AND s."turnSeq" = ${turnSeq}
            AND s.mode = 'AUTO'
        )
        AND EXISTS (
          SELECT 1 FROM "InboxConversation" c
          WHERE c.id = ${conversationId}::uuid
            AND c."deletedAt" IS NULL
            AND c.status <> 'ARCHIVED'
        )
      RETURNING t.id
    `;
    return rows.length === 1;
  }
  async assign(c: CallerContext, id: string, dto: AssignmentDto) {
    const row = await this.full(c, id);
    this.assertMutable(row);
    if (dto.employeeId) this.policy.assert(c, 'inbox.assign.employee');
    if (dto.teamId) this.policy.assert(c, 'inbox.assign.team');
    if (row.assignedEmployeeId || row.assignedTeamId)
      this.policy.assert(c, 'inbox.reassign');
    if (
      row.assignedEmployeeId === dto.employeeId &&
      row.assignedTeamId === dto.teamId
    )
      return this.projectWithAi(row);
    const org = row.organizationId;
    const employee = dto.employeeId
      ? await this.repo.db.account.findFirst({
          where: {
            id: dto.employeeId,
            status: 'ACTIVE',
          },
        })
      : null;
    if (dto.employeeId && !employee)
      throw new DomainException('employee-inactive', 'الموظف غير صالح', 422);
    const team = dto.teamId
      ? await this.repo.db.ticketTeam.findFirst({
          where: { id: dto.teamId, organizationId: org, active: true },
        })
      : null;
    if (dto.teamId && !team)
      throw new DomainException('team-inactive', 'الفريق غير صالح', 422);
    if (
      dto.employeeId &&
      dto.teamId &&
      !(await this.repo.db.ticketTeamMembership.findFirst({
        where: { employeeId: dto.employeeId, teamId: dto.teamId, active: true },
      }))
    )
      throw new DomainException(
        'assignment-mismatch',
        'الموظف ليس عضواً نشطاً في الفريق',
        422,
      );
    await this.repo.db.$transaction(async (tx) => {
      await tx.inboxConversation.update({
        where: { id },
        data: {
          assignedEmployeeId: dto.employeeId,
          assignedTeamId: dto.teamId,
          version: { increment: 1 },
          lastActivityAt: new Date(),
          assignmentHistory: {
            create: {
              previousEmployeeId: row.assignedEmployeeId,
              previousTeamId: row.assignedTeamId,
              nextEmployeeId: dto.employeeId,
              nextTeamId: dto.teamId,
              actorId: c.accountId,
              actorName: c.displayName,
            },
          },
          systemEvents: {
            create: this.event(c, 'assignment.changed', 'تم تحديث الإسناد'),
          },
        },
      });
    });
    return this.projectWithAi(await this.full(c, id));
  }
  async changeStatus(c: CallerContext, id: string, status: string) {
    this.policy.assert(c, 'inbox.change.status');
    const row = await this.full(c, id);
    this.assertMutable(row);
    if (row.status === statusDb(status)) return this.projectWithAi(row);
    await this.repo.db.inboxConversation.update({
      where: { id },
      data: {
        status: statusDb(status),
        closedAt: status === 'closed' ? new Date() : null,
        version: { increment: 1 },
        lastActivityAt: new Date(),
        systemEvents: {
          create: this.event(
            c,
            'status.changed',
            `تغيرت الحالة إلى ${labels[status]}`,
          ),
        },
      },
    });
    return this.projectWithAi(await this.full(c, id));
  }
  async toggleTag(c: CallerContext, id: string, tagId: string) {
    this.policy.assert(c, 'inbox.manage.tags');
    const row = await this.full(c, id);
    this.assertMutable(row);
    const tag = await this.repo.db.inboxTag.findFirst({
      where: { id: tagId, organizationId: row.organizationId, active: true },
    });
    if (!tag) throw new DomainException('tag-invalid', 'الوسم غير صالح', 422);
    const has = row.tags.some((x) => x.tagId === tagId);
    await this.repo.db.$transaction(async (tx) => {
      if (has)
        await tx.inboxConversationTag.delete({
          where: { conversationId_tagId: { conversationId: id, tagId } },
        });
      else
        await tx.inboxConversationTag.create({
          data: { conversationId: id, tagId, addedBy: c.accountId },
        });
      await tx.inboxConversation.update({
        where: { id },
        data: {
          version: { increment: 1 },
          lastActivityAt: new Date(),
          systemEvents: {
            create: this.event(c, 'tags.changed', 'تم تحديث الوسوم', {
              tagId,
              added: !has,
            }),
          },
        },
      });
    });
    return this.projectWithAi(await this.full(c, id));
  }
  private async lifecycle(
    c: CallerContext,
    id: string,
    action: 'archive' | 'restore' | 'delete',
  ) {
    this.policy.assert(c, `inbox.${action}`);
    const row = await this.full(c, id, action === 'restore');
    if (action === 'archive' && row.status === 'ARCHIVED')
      return this.projectWithAi(row);
    if (action === 'restore' && !row.deletedAt && row.status !== 'ARCHIVED')
      return this.projectWithAi(row);
    const now = new Date();
    await this.repo.db.inboxConversation.update({
      where: { id },
      data:
        action === 'archive'
          ? {
              previousStatus: row.status,
              status: 'ARCHIVED',
              version: { increment: 1 },
              lastActivityAt: now,
              systemEvents: {
                create: this.event(
                  c,
                  'conversation.archived',
                  'تمت أرشفة المحادثة',
                ),
              },
            }
          : action === 'delete'
            ? {
                previousStatus: row.status,
                deletedAt: now,
                version: { increment: 1 },
                lastActivityAt: now,
                systemEvents: {
                  create: this.event(
                    c,
                    'conversation.deleted',
                    'حُذفت المحادثة',
                  ),
                },
              }
            : {
                deletedAt: null,
                status:
                  row.previousStatus === 'ARCHIVED'
                    ? 'OPEN'
                    : (row.previousStatus ?? 'OPEN'),
                version: { increment: 1 },
                lastActivityAt: now,
                systemEvents: {
                  create: this.event(
                    c,
                    'conversation.restored',
                    'تمت استعادة المحادثة',
                  ),
                },
              },
    });
    if (action === 'delete') return;
    return this.projectWithAi(await this.full(c, id));
  }
  async archive(c: CallerContext, id: string) {
    const result = await this.lifecycle(c, id, 'archive');
    if (!result) throw new NotFoundException();
    return result;
  }
  async restore(c: CallerContext, id: string) {
    const result = await this.lifecycle(c, id, 'restore');
    if (!result) throw new NotFoundException();
    return result;
  }
  delete(c: CallerContext, id: string) {
    return this.lifecycle(c, id, 'delete');
  }
  async addNote(c: CallerContext, id: string, content: string) {
    this.policy.assert(c, 'inbox.manage.notes');
    this.assertMutable(await this.full(c, id));
    const value = content.trim();
    if (!value) throw new DomainException('validation', 'اكتب الملاحظة', 422);
    return this.repo.db.$transaction(async (tx) => {
      const note = await tx.inboxInternalNote.create({
        data: {
          conversationId: id,
          authorEmployeeId: c.accountId,
          authorName: c.displayName,
          content: value,
        },
      });
      await tx.inboxConversation.update({
        where: { id },
        data: {
          version: { increment: 1 },
          systemEvents: {
            create: this.event(c, 'note.added', 'أضيفت ملاحظة داخلية', {
              noteId: note.id,
            }),
          },
        },
      });
      return {
        ...note,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt?.toISOString(),
      };
    });
  }
  async editNote(
    c: CallerContext,
    id: string,
    noteId: string,
    content: string,
  ) {
    this.policy.assert(c, 'inbox.manage.notes');
    this.assertMutable(await this.full(c, id));
    const value = content.trim();
    if (!value) throw new DomainException('validation', 'اكتب الملاحظة', 422);
    const note = await this.repo.db.inboxInternalNote.findFirst({
      where: { id: noteId, conversationId: id },
    });
    if (!note) throw new NotFoundException();
    if (note.authorEmployeeId !== c.accountId)
      throw new DomainException('forbidden', 'يمكنك تعديل ملاحظاتك فقط', 403);
    return this.repo.db.$transaction(async (tx) => {
      const updated = await tx.inboxInternalNote.update({
        where: { id: noteId },
        data: { content: value, updatedAt: new Date() },
      });
      await tx.inboxConversation.update({
        where: { id },
        data: {
          version: { increment: 1 },
          systemEvents: {
            create: this.event(c, 'note.edited', 'عُدلت ملاحظة داخلية', {
              noteId,
            }),
          },
        },
      });
      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt?.toISOString(),
      };
    });
  }
  async deleteNote(c: CallerContext, id: string, noteId: string) {
    this.policy.assert(c, 'inbox.manage.notes');
    this.assertMutable(await this.full(c, id));
    const note = await this.repo.db.inboxInternalNote.findFirst({
      where: { id: noteId, conversationId: id },
    });
    if (!note) throw new NotFoundException();
    if (note.authorEmployeeId !== c.accountId)
      throw new DomainException('forbidden', 'يمكنك حذف ملاحظاتك فقط', 403);
    await this.repo.db.$transaction(async (tx) => {
      await tx.inboxInternalNote.delete({ where: { id: noteId } });
      await tx.inboxConversation.update({
        where: { id },
        data: {
          version: { increment: 1 },
          systemEvents: {
            create: this.event(c, 'note.deleted', 'حُذفت ملاحظة داخلية', {
              noteId,
            }),
          },
        },
      });
    });
  }
}
