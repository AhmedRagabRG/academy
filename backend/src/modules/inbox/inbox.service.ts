import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../../prisma/generated/client';
import { DomainException, NotFoundException } from '../../core/exceptions';
import type { CallerContext } from '../../shared/types/caller-context';
import {
  STORAGE_SERVICE,
  type StorageService,
  type UploadedFile,
} from '../../storage/storage.service.interface';
import type { AssignmentDto, InboxListDto, ReplyDto } from './dto/inbox.dto';
import {
  INBOX_DELIVERY_PORT,
  type InboxDeliveryPort,
} from './delivery/inbox-delivery.port';
import { InboxCrmLinkService } from './crm/inbox-crm-link.service';
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
} satisfies Prisma.InboxConversationInclude;
type Aggregate = Prisma.InboxConversationGetPayload<{
  include: typeof aggregateInclude;
}>;

@Injectable()
export class InboxService {
  private readonly attachmentTtlMs = 60 * 60 * 1000;
  constructor(
    private readonly repo: InboxRepository,
    private readonly policy: InboxPolicy,
    @Inject(INBOX_DELIVERY_PORT) private readonly delivery: InboxDeliveryPort,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    private readonly crm: InboxCrmLinkService,
  ) {}
  private event(
    c: CallerContext,
    type: string,
    label: string,
    payload?: Prisma.InputJsonValue,
  ) {
    return {
      type,
      label,
      actorId: c.accountId,
      actorName: c.displayName,
      payload,
    };
  }
  private project(row: Aggregate) {
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
        label: e.label,
        actorName: e.actorName,
        occurredAt: e.occurredAt.toISOString(),
      })),
    };
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
      items: items.map((x) => this.project(x)),
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
      ...this.project(row),
      crm: await this.crm.summary(row.customerId),
    };
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
    return this.project(await this.full(c, id));
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
      platforms: platforms.map((x) => ({ id: x.id, label: x.label })),
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
      const created = await tx.inboxMessage.create({
        data: {
          id: messageId,
          conversationId: id,
          direction: 'OUTGOING',
          senderName: c.displayName,
          body,
          sentAt,
          delivery: 'QUEUED',
          retryToken: dto.retryToken,
          createdBy: c.accountId,
          attachments: {
            create: dto.attachments.map((a) => ({
              sourceId: a.id,
              kind: a.kind,
              fileName: a.fileName,
              sizeBytes: a.sizeBytes,
              storageKey: sourceById.get(a.id)!.storageId,
              ownerAccountId: c.accountId,
              durationSeconds: a.durationSeconds,
            })),
          },
        },
      });
      await tx.inboxConversation.update({
        where: { id: current.id },
        data: {
          lastMessage: body || dto.attachments[0].fileName,
          lastActivityAt: sentAt,
          unreadCount: 0,
          version: { increment: 1 },
          systemEvents: {
            create: this.event(c, 'reply.sent', 'تم إرسال رد', {
              messageId: created.id,
            }),
          },
        },
      });
      return created;
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
    return this.project(await this.full(c, id));
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
      return this.project(row);
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
    return this.project(await this.full(c, id));
  }
  async changeStatus(c: CallerContext, id: string, status: string) {
    this.policy.assert(c, 'inbox.change.status');
    const row = await this.full(c, id);
    this.assertMutable(row);
    if (row.status === statusDb(status)) return this.project(row);
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
    return this.project(await this.full(c, id));
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
    return this.project(await this.full(c, id));
  }
  private async lifecycle(
    c: CallerContext,
    id: string,
    action: 'archive' | 'restore' | 'delete',
  ) {
    this.policy.assert(c, `inbox.${action}`);
    const row = await this.full(c, id, action === 'restore');
    if (action === 'archive' && row.status === 'ARCHIVED')
      return this.project(row);
    if (action === 'restore' && !row.deletedAt && row.status !== 'ARCHIVED')
      return this.project(row);
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
    return this.project(await this.full(c, id));
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
