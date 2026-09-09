import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../prisma/generated/client';
import type {
  CampaignEventKind,
  CampaignRecipientStatus,
  CampaignStatus,
  Contact,
  WhatsappTemplate,
} from '../../../prisma/generated/client';
import {
  DomainException,
  DuplicateException,
  NotFoundException,
  VersionConflictException,
} from '../../core/exceptions';
import type { CallerContext } from '../../shared/types/caller-context';
import { ContactService } from '../contacts/contact.service';
import { normalizeName, normalizePhone } from '../contacts/contact.repository';
import { ChannelCredentialsService } from '../inbox/channels/channel-credentials.service';
import { CampaignPolicy } from './campaign.policy';
import { CampaignRepository } from './campaign.repository';
import { WhatsappTemplateSender } from './dispatch/whatsapp-template.sender';
import { WhatsappTemplateService } from './templates/whatsapp-template.service';
import { parsePlaceholders, renderPreview } from './templates/template-parsing';
import {
  CONTACT_TOKENS,
  type AudiencePreviewDto,
  type CampaignDraftDto,
  type CampaignListDto,
  type ContactTokenCode,
  type ImportAudienceDto,
  type LaunchCampaignDto,
  type RecipientListDto,
  type TestSendDto,
  type UpdateCampaignDto,
  type VariableBindingDto,
} from './dto/campaign.dto';

const STATUS_WIRE: Record<CampaignStatus, string> = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};
const STATUS_DB: Record<string, CampaignStatus> = Object.fromEntries(
  Object.entries(STATUS_WIRE).map(([db, wire]) => [wire, db as CampaignStatus]),
);

const RECIPIENT_WIRE: Record<CampaignRecipientStatus, string> = {
  PENDING: 'pending',
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
  SKIPPED: 'skipped',
};
const RECIPIENT_DB: Record<string, CampaignRecipientStatus> =
  Object.fromEntries(
    Object.entries(RECIPIENT_WIRE).map(([db, wire]) => [
      wire,
      db as CampaignRecipientStatus,
    ]),
  );

/** Recipient values are frozen at launch, so only a true draft is editable. */
const EDITABLE: CampaignStatus[] = ['DRAFT'];

export interface VariableBinding {
  position: number;
  source: 'contact' | 'field' | 'literal';
  value: string;
  fallback: string;
}

const aggregateInclude = {
  template: true,
  audiences: true,
} satisfies Prisma.CampaignInclude;
type Aggregate = Prisma.CampaignGetPayload<{
  include: typeof aggregateInclude;
}>;

type AudienceContact = Contact & {
  customValues: Array<{ fieldId: string; value: string }>;
};

export interface CampaignStats {
  total: number;
  pending: number;
  sending: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  skipped: number;
}

const emptyStats = (): CampaignStats => ({
  total: 0,
  pending: 0,
  sending: 0,
  sent: 0,
  delivered: 0,
  read: 0,
  failed: 0,
  skipped: 0,
});

/**
 * WhatsApp parameters may not carry newlines, tabs, or runs of four or more
 * spaces — Meta rejects the whole message rather than trimming it.
 */
const sanitize = (value: string): string =>
  value.replace(/\s+/g, ' ').trim().slice(0, 900);

@Injectable()
export class CampaignService {
  constructor(
    private readonly repo: CampaignRepository,
    private readonly policy: CampaignPolicy,
    private readonly templates: WhatsappTemplateService,
    private readonly contacts: ContactService,
    private readonly sender: WhatsappTemplateSender,
    private readonly credentials: ChannelCredentialsService,
  ) {}

  // ---------------------------------------------------------------- projection

  private bindings(value: Prisma.JsonValue | null): VariableBinding[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (entry): entry is Record<string, Prisma.JsonValue> =>
          Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
      )
      .map((entry) => ({
        position: Number(entry.position ?? 0),
        source: (entry.source ?? 'literal') as VariableBinding['source'],
        value: typeof entry.value === 'string' ? entry.value : '',
        fallback: typeof entry.fallback === 'string' ? entry.fallback : '',
      }))
      .sort((a, b) => a.position - b.position);
  }

  private project(row: Aggregate, stats: CampaignStats) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: STATUS_WIRE[row.status],
      template: this.templates.project(row.template),
      groupIds: row.audiences.map((audience) => audience.groupId),
      variables: this.bindings(row.variableMap),
      headerVariables: this.bindings(row.headerVariableMap),
      throttlePerMinute: row.throttlePerMinute,
      scheduledAt: row.scheduledAt?.toISOString(),
      startedAt: row.startedAt?.toISOString(),
      completedAt: row.completedAt?.toISOString(),
      lastError: row.lastError ?? undefined,
      stats,
      createdByName: row.createdByName,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** One grouped count for a page of campaigns rather than a query each. */
  private async statsFor(
    campaignIds: readonly string[],
  ): Promise<Map<string, CampaignStats>> {
    const result = new Map<string, CampaignStats>(
      campaignIds.map((id) => [id, emptyStats()]),
    );
    if (!campaignIds.length) return result;
    const rows = await this.repo.db.campaignRecipient.groupBy({
      by: ['campaignId', 'status'],
      where: { campaignId: { in: [...campaignIds] } },
      _count: { _all: true },
    });
    for (const row of rows) {
      const stats = result.get(row.campaignId);
      if (!stats) continue;
      const count = row._count._all;
      stats.total += count;
      stats[RECIPIENT_WIRE[row.status] as keyof CampaignStats] = count;
    }
    return result;
  }

  // ---------------------------------------------------------------------- read

  async list(c: CallerContext, q: CampaignListDto) {
    const scope = this.policy.scope(c);
    const organizationId = await this.repo.organizationId();
    const fingerprint = this.repo.fingerprint(q);
    const cursor = this.repo.decode(q.cursor, fingerprint);
    const snapshotAt = cursor?.snapshotAt ?? new Date().toISOString();
    const search = q.search.trim();
    const base: Prisma.CampaignWhereInput = {
      organizationId,
      deletedAt: null,
      createdAt: { lte: new Date(snapshotAt) },
      AND: [
        scope,
        q.status ? { status: STATUS_DB[q.status] } : {},
        q.templateId ? { templateId: q.templateId } : {},
        search
          ? {
              OR: [
                { normalizedName: { contains: normalizeName(search) } },
                {
                  template: { name: { contains: search, mode: 'insensitive' } },
                },
              ],
            }
          : {},
      ],
    };
    const [rows, total] = await Promise.all([
      this.repo.db.campaign.findMany({
        where: { AND: [base, this.repo.cursorWhere(cursor)] },
        include: aggregateInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: q.limit + 1,
      }),
      this.repo.db.campaign.count({ where: base }),
    ]);
    const hasMore = rows.length > q.limit;
    const items = rows.slice(0, q.limit);
    const stats = await this.statsFor(items.map((row) => row.id));
    const last = items.at(-1);
    return {
      items: items.map((row) =>
        this.project(row, stats.get(row.id) ?? emptyStats()),
      ),
      total,
      nextCursor:
        hasMore && last
          ? this.repo.encode({
              v: 1,
              fingerprint,
              id: last.id,
              snapshotAt,
              createdAt: last.createdAt.toISOString(),
            })
          : null,
    };
  }

  private async visible(c: CallerContext, id: string): Promise<Aggregate> {
    const organizationId = await this.repo.organizationId();
    const row = await this.repo.db.campaign.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
        AND: [this.policy.scope(c)],
      },
      include: aggregateInclude,
    });
    this.policy.assertVisible(row);
    return row;
  }

  async detail(c: CallerContext, id: string) {
    const row = await this.visible(c, id);
    const stats = await this.statsFor([row.id]);
    const events = await this.repo.db.campaignEvent.findMany({
      where: { campaignId: row.id },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: 50,
    });
    return {
      ...this.project(row, stats.get(row.id) ?? emptyStats()),
      events: events.map((event) => ({
        id: event.id,
        kind: event.kind.toLowerCase(),
        label: event.label,
        actorName: event.actorName,
        occurredAt: event.occurredAt.toISOString(),
      })),
    };
  }

  async lookups(c: CallerContext) {
    this.policy.assert(c, 'campaigns.view');
    const organizationId = await this.repo.organizationId();
    const [templates, groups, fields, channel] = await Promise.all([
      this.repo.db.whatsappTemplate.findMany({
        where: { organizationId, status: 'APPROVED' },
        orderBy: [{ name: 'asc' }, { language: 'asc' }],
      }),
      this.repo.db.contactGroup.findMany({
        where: { organizationId, active: true },
        orderBy: { normalizedName: 'asc' },
        include: { _count: { select: { members: true } } },
      }),
      this.repo.db.contactCustomField.findMany({
        where: { organizationId, active: true },
        orderBy: [{ displayOrder: 'asc' }, { normalizedLabel: 'asc' }],
      }),
      this.credentials.forPlatform(organizationId, 'whatsapp'),
    ]);
    const lastSync = await this.repo.db.whatsappTemplate.findFirst({
      where: { organizationId },
      orderBy: { syncedAt: 'desc' },
      select: { syncedAt: true },
    });
    return {
      templates: templates.map((template) => this.templates.project(template)),
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        memberCount: group._count.members,
      })),
      customFields: fields.map((field) => ({
        id: field.id,
        label: field.label,
        type: field.kind.toLowerCase(),
      })),
      contactTokens: [...CONTACT_TOKENS],
      channel: {
        linked: Boolean(channel),
        accountId: channel?.providerAccountId,
        businessAccountId: channel?.businessAccountId,
      },
      templatesSyncedAt: lastSync?.syncedAt.toISOString(),
    };
  }

  // --------------------------------------------------------------------- write

  /**
   * A campaign may only be created or updated against a template Meta has
   * currently approved — the same rule `launch` enforces on the frozen
   * campaign, applied up front so a draft never silently binds itself to a
   * template that cannot ever be sent.
   */
  private async template(
    organizationId: string,
    templateId: string,
  ): Promise<WhatsappTemplate> {
    const template = await this.repo.db.whatsappTemplate.findFirst({
      where: { id: templateId, organizationId },
    });
    if (!template)
      throw new DomainException(
        'template-invalid',
        'القالب غير موجود. زامن القوالب من حساب واتساب.',
        422,
      );
    if (template.status !== 'APPROVED')
      throw new DomainException(
        'template-not-approved',
        'لا يمكن اختيار قالب غير معتمد من Meta.',
        422,
      );
    return template;
  }

  /** Maps a unique-name race lost at the database to the same error the
   * pre-check would have raised had it seen the other transaction first. */
  private mapWriteConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      throw new DuplicateException();
    throw error;
  }

  /** Every placeholder must be bound exactly once before a campaign may run. */
  private assertBindings(
    template: WhatsappTemplate,
    dto: CampaignDraftDto,
    fieldIds: readonly string[],
  ): void {
    const check = (
      tokens: readonly string[],
      bindings: readonly VariableBindingDto[],
      label: string,
    ) => {
      if (bindings.length !== tokens.length)
        throw new DomainException(
          'variables-mismatch',
          `${label}: القالب يحتاج ${tokens.length} متغيرًا وتم ربط ${bindings.length}.`,
          422,
        );
      const positions = new Set(bindings.map((binding) => binding.position));
      for (let position = 1; position <= tokens.length; position += 1)
        if (!positions.has(position))
          throw new DomainException(
            'variables-mismatch',
            `${label}: المتغير رقم ${position} غير مربوط.`,
            422,
          );
      for (const binding of bindings) {
        if (binding.source === 'literal' && !binding.value.trim())
          throw new DomainException(
            'variables-mismatch',
            `${label}: النص الثابت للمتغير ${binding.position} فارغ.`,
            422,
          );
        if (
          binding.source === 'contact' &&
          !CONTACT_TOKENS.includes(binding.value as ContactTokenCode)
        )
          throw new DomainException(
            'variables-mismatch',
            `${label}: حقل جهة الاتصال «${binding.value}» غير معروف.`,
            422,
          );
        if (binding.source === 'field' && !fieldIds.includes(binding.value))
          throw new DomainException(
            'variables-mismatch',
            `${label}: الحقل المخصص غير موجود.`,
            422,
          );
      }
    };
    check(parsePlaceholders(template.bodyText), dto.variables, 'نص الرسالة');
    check(
      parsePlaceholders(template.headerText ?? ''),
      dto.headerVariables,
      'ترويسة الرسالة',
    );
  }

  private async fieldIds(organizationId: string): Promise<string[]> {
    const fields = await this.repo.db.contactCustomField.findMany({
      where: { organizationId, active: true },
      select: { id: true },
    });
    return fields.map((field) => field.id);
  }

  private async assertAudienceGroups(
    organizationId: string,
    groupIds: readonly string[],
  ): Promise<void> {
    if (!groupIds.length) return;
    const uniqueIds = [...new Set(groupIds)];
    const count = await this.repo.db.contactGroup.count({
      where: {
        id: { in: uniqueIds },
        organizationId,
        active: true,
      },
    });
    if (count !== uniqueIds.length)
      throw new DomainException(
        'audience-invalid',
        'إحدى مجموعات الجمهور غير موجودة أو لم تعد نشطة.',
        422,
      );
  }

  private bindingData(
    bindings: readonly VariableBindingDto[],
  ): Prisma.InputJsonValue {
    return bindings
      .map((binding) => ({
        position: binding.position,
        source: binding.source,
        value: binding.value,
        fallback: binding.fallback ?? '',
      }))
      .sort((a, b) => a.position - b.position);
  }

  private async event(
    campaignId: string,
    kind: CampaignEventKind,
    label: string,
    c: CallerContext,
    payload?: Prisma.InputJsonValue,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await (tx ?? this.repo.db).campaignEvent.create({
      data: {
        campaignId,
        kind,
        label,
        actorId: c.accountId || null,
        actorName: c.displayName || 'النظام',
        ...(payload ? { payload } : {}),
      },
    });
  }

  async create(c: CallerContext, dto: CampaignDraftDto) {
    this.policy.assert(c, 'campaigns.create');
    const organizationId = await this.repo.organizationId();
    const template = await this.template(organizationId, dto.templateId);
    this.assertBindings(template, dto, await this.fieldIds(organizationId));
    await this.assertAudienceGroups(organizationId, dto.groupIds);
    const normalized = normalizeName(dto.name);
    const clash = await this.repo.db.campaign.findFirst({
      where: { organizationId, normalizedName: normalized, deletedAt: null },
      select: { id: true },
    });
    if (clash) throw new DuplicateException();

    try {
      const row = await this.repo.db.$transaction(async (tx) => {
        const created = await tx.campaign.create({
          data: {
            organizationId,
            name: dto.name,
            normalizedName: normalized,
            description: dto.description ?? '',
            templateId: template.id,
            connectionId: null,
            variableMap: this.bindingData(dto.variables),
            headerVariableMap: this.bindingData(dto.headerVariables),
            throttlePerMinute: dto.throttlePerMinute,
            scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
            createdById: c.accountId,
            createdByName: c.displayName,
            updatedBy: c.accountId,
            audiences: {
              createMany: {
                data: dto.groupIds.map((groupId) => ({ groupId })),
                skipDuplicates: true,
              },
            },
          },
          include: aggregateInclude,
        });
        await this.event(
          created.id,
          'CREATED',
          'أُنشئت الحملة',
          c,
          undefined,
          tx,
        );
        return created;
      });
      return this.project(row, emptyStats());
    } catch (error) {
      this.mapWriteConflict(error);
    }
  }

  async update(c: CallerContext, id: string, dto: UpdateCampaignDto) {
    this.policy.assert(c, 'campaigns.update');
    const current = await this.visible(c, id);
    if (dto.expectedVersion !== current.version)
      throw new VersionConflictException(current.version);
    if (!EDITABLE.includes(current.status))
      throw new DomainException(
        'campaign-not-editable',
        'لا يمكن تعديل حملة بعد اكتمالها أو إلغائها.',
        409,
      );
    const template = await this.template(
      current.organizationId,
      dto.templateId,
    );
    this.assertBindings(
      template,
      dto,
      await this.fieldIds(current.organizationId),
    );
    await this.assertAudienceGroups(current.organizationId, dto.groupIds);
    const normalized = normalizeName(dto.name);
    if (normalized !== current.normalizedName) {
      const clash = await this.repo.db.campaign.findFirst({
        where: {
          organizationId: current.organizationId,
          normalizedName: normalized,
          deletedAt: null,
          id: { not: id },
        },
        select: { id: true },
      });
      if (clash) throw new DuplicateException();
    }

    let row: Aggregate;
    try {
      row = await this.repo.db.$transaction(async (tx) => {
        // The version + status guard and every write it authorizes commit as
        // one statement: a concurrent update or launch between the read above
        // and this call can only ever match zero rows here, never corrupt one.
        const guarded = await tx.campaign.updateMany({
          where: {
            id,
            version: dto.expectedVersion,
            status: 'DRAFT',
            deletedAt: null,
          },
          data: {
            name: dto.name,
            normalizedName: normalized,
            description: dto.description ?? '',
            templateId: template.id,
            connectionId: null,
            variableMap: this.bindingData(dto.variables),
            headerVariableMap: this.bindingData(dto.headerVariables),
            throttlePerMinute: dto.throttlePerMinute,
            scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
            updatedBy: c.accountId,
            version: { increment: 1 },
          },
        });
        if (guarded.count === 0) {
          const latest = await tx.campaign.findUnique({
            where: { id },
            select: { version: true, status: true, deletedAt: true },
          });
          if (!latest || latest.deletedAt) throw new NotFoundException();
          if (latest.version !== dto.expectedVersion)
            throw new VersionConflictException(latest.version);
          if (!EDITABLE.includes(latest.status))
            throw new DomainException(
              'campaign-not-editable',
              'لا يمكن تعديل حملة بعد اكتمالها أو إلغائها.',
              409,
            );
          throw new VersionConflictException(latest.version);
        }
        await tx.campaignAudience.deleteMany({ where: { campaignId: id } });
        if (dto.groupIds.length)
          await tx.campaignAudience.createMany({
            data: dto.groupIds.map((groupId) => ({
              campaignId: id,
              groupId,
            })),
            skipDuplicates: true,
          });
        await this.event(
          id,
          'UPDATED',
          'حُدثت إعدادات الحملة',
          c,
          undefined,
          tx,
        );
        return tx.campaign.findUniqueOrThrow({
          where: { id },
          include: aggregateInclude,
        });
      });
    } catch (error) {
      this.mapWriteConflict(error);
    }
    const stats = await this.statsFor([id]);
    return this.project(row, stats.get(id) ?? emptyStats());
  }

  async remove(c: CallerContext, id: string): Promise<void> {
    this.policy.assert(c, 'campaigns.delete');
    const current = await this.visible(c, id);
    if (current.status === 'RUNNING' || current.status === 'SCHEDULED')
      throw new DomainException(
        'campaign-active',
        'أوقف الحملة قبل حذفها.',
        409,
      );
    await this.repo.db.campaign.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: c.accountId,
        version: { increment: 1 },
      },
    });
  }

  // ------------------------------------------------------------------ audience

  private async audienceContacts(
    c: CallerContext,
    organizationId: string,
    groupIds: readonly string[],
    contactIds: readonly string[],
  ): Promise<AudienceContact[]> {
    if (!groupIds.length && !contactIds.length) return [];
    return this.repo.db.contact.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          ...(groupIds.length
            ? [{ groups: { some: { groupId: { in: [...groupIds] } } } }]
            : []),
          ...(contactIds.length ? [{ id: { in: [...contactIds] } }] : []),
        ],
      },
      include: { customValues: { select: { fieldId: true, value: true } } },
      orderBy: { createdAt: 'asc' },
      take: 20_000,
    });
  }

  async previewAudience(c: CallerContext, dto: AudiencePreviewDto) {
    this.policy.assert(c, 'campaigns.view');
    const organizationId = await this.repo.organizationId();
    const contacts = await this.audienceContacts(
      c,
      organizationId,
      dto.groupIds,
      dto.contactIds,
    );
    const unique = new Map<string, AudienceContact>();
    let invalid = 0;
    for (const contact of contacts) {
      const phone = normalizePhone(contact.phone);
      if (!phone) {
        invalid += 1;
        continue;
      }
      if (!unique.has(phone)) unique.set(phone, contact);
    }
    return {
      total: unique.size,
      duplicates: contacts.length - unique.size - invalid,
      invalid,
      sample: [...unique.values()].slice(0, 8).map((contact) => ({
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
      })),
    };
  }

  private resolve(
    binding: VariableBinding,
    contact: AudienceContact,
    values: Map<string, string>,
  ): string {
    if (binding.source === 'literal') return sanitize(binding.value);
    const raw =
      binding.source === 'field'
        ? (values.get(binding.value) ?? '')
        : ({
            name: contact.name,
            phone: contact.phone,
            email: contact.email ?? '',
            company: contact.company ?? '',
            role: contact.jobTitle ?? '',
            ownerName: contact.ownerName,
          }[binding.value as ContactTokenCode] ?? '');
    return sanitize(raw) || sanitize(binding.fallback);
  }

  /**
   * Freezes the audience into recipient rows.
   *
   * Values are rendered now rather than at send time, so an edit to a contact
   * midway through a campaign cannot change what the rest of the audience is
   * told, and the sent wording stays reconstructable afterwards.
   */
  private async materialize(
    c: CallerContext,
    campaign: Aggregate,
  ): Promise<{ queued: number; skipped: number }> {
    const contacts = await this.audienceContacts(
      c,
      campaign.organizationId,
      campaign.audiences.map((audience) => audience.groupId),
      [],
    );
    const bodyBindings = this.bindings(campaign.variableMap);
    const headerBindings = this.bindings(campaign.headerVariableMap);
    const seen = new Set<string>();
    const rows: Prisma.CampaignRecipientCreateManyInput[] = [];
    let skipped = 0;

    for (const contact of contacts) {
      const normalizedPhone = normalizePhone(contact.phone);
      if (!normalizedPhone || seen.has(normalizedPhone)) continue;
      seen.add(normalizedPhone);
      const values = new Map(
        contact.customValues.map((value) => [value.fieldId, value.value]),
      );
      const variables = bodyBindings.map((binding) =>
        this.resolve(binding, contact, values),
      );
      const headerVariables = headerBindings.map((binding) =>
        this.resolve(binding, contact, values),
      );
      const incomplete = [...variables, ...headerVariables].some(
        (value) => !value,
      );
      if (incomplete) skipped += 1;
      rows.push({
        campaignId: campaign.id,
        contactId: contact.id,
        name: contact.name,
        phone: contact.phone,
        normalizedPhone,
        variables,
        headerVariables,
        ...(incomplete
          ? {
              status: 'SKIPPED' as const,
              errorCode: 'missing-variable',
              errorMessage: 'قيمة أحد المتغيرات فارغة لهذه الجهة',
            }
          : {}),
      });
    }

    for (let index = 0; index < rows.length; index += 1000)
      await this.repo.db.campaignRecipient.createMany({
        data: rows.slice(index, index + 1000),
        skipDuplicates: true,
      });

    const queued = rows.length - skipped;
    await this.repo.db.campaign.update({
      where: { id: campaign.id },
      data: { totalRecipients: rows.length, skippedCount: skipped },
    });
    return { queued, skipped };
  }

  // ----------------------------------------------------------------- lifecycle

  async launch(c: CallerContext, id: string, dto: LaunchCampaignDto) {
    this.policy.assert(c, 'campaigns.launch');
    const campaign = await this.visible(c, id);
    if (campaign.status !== 'DRAFT')
      throw new DomainException(
        'campaign-not-launchable',
        'يمكن إطلاق الحملات في حالة المسودة فقط.',
        409,
      );
    if (campaign.template.status !== 'APPROVED')
      throw new DomainException(
        'template-not-approved',
        'لا يمكن الإرسال بقالب غير معتمد من Meta.',
        422,
      );
    if (!campaign.audiences.length)
      throw new DomainException(
        'audience-empty',
        'اختر مجموعة جهات اتصال واحدة على الأقل.',
        422,
      );
    const channel = await this.credentials.forPlatform(
      campaign.organizationId,
      'whatsapp',
    );
    if (!channel)
      throw new DomainException(
        'channel-not-configured',
        'قناة واتساب غير مهيأة على الخادم. أضف بيانات الاعتماد في متغيرات البيئة.',
        503,
      );
    this.assertBindings(
      campaign.template,
      {
        ...({} as CampaignDraftDto),
        variables: this.bindings(campaign.variableMap),
        headerVariables: this.bindings(campaign.headerVariableMap),
      },
      await this.fieldIds(campaign.organizationId),
    );

    const { queued, skipped } = await this.materialize(c, campaign);
    if (!queued) {
      // A corrected variable mapping must be able to rebuild the audience on
      // the next launch attempt; skipped rows contain the old frozen values.
      await this.repo.db.$transaction([
        this.repo.db.campaignRecipient.deleteMany({
          where: { campaignId: id },
        }),
        this.repo.db.campaign.update({
          where: { id },
          data: { totalRecipients: 0, skippedCount: 0 },
        }),
      ]);
      throw new DomainException(
        'audience-empty',
        skipped
          ? 'كل جهات الاتصال ينقصها متغير مطلوب. أضف قيمة احتياطية للمتغيرات.'
          : 'لا توجد جهات اتصال صالحة في المجموعات المختارة.',
        422,
      );
    }

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    const scheduled = Boolean(
      scheduledAt && scheduledAt.getTime() > Date.now(),
    );
    await this.repo.db.campaign.update({
      where: { id },
      data: {
        status: scheduled ? 'SCHEDULED' : 'RUNNING',
        scheduledAt,
        startedAt: scheduled ? null : new Date(),
        lastError: null,
        updatedBy: c.accountId,
        version: { increment: 1 },
      },
    });
    await this.event(
      id,
      scheduled ? 'AUDIENCE_BUILT' : 'STARTED',
      scheduled
        ? `جُدولت الحملة لـ ${queued} مستلمًا`
        : `بدأ إرسال الحملة إلى ${queued} مستلمًا`,
      c,
      { queued, skipped },
    );
    return this.detail(c, id);
  }

  private async transition(
    c: CallerContext,
    id: string,
    from: CampaignStatus[],
    to: CampaignStatus,
    kind: CampaignEventKind,
    label: string,
    refusal: string,
  ) {
    const campaign = await this.visible(c, id);
    if (!from.includes(campaign.status))
      throw new DomainException('campaign-state-invalid', refusal, 409);
    await this.repo.db.campaign.update({
      where: { id },
      data: {
        status: to,
        ...(to === 'RUNNING' && !campaign.startedAt
          ? { startedAt: new Date() }
          : {}),
        ...(to === 'CANCELLED' ? { completedAt: new Date() } : {}),
        ...(to === 'RUNNING' ? { lastError: null } : {}),
        updatedBy: c.accountId,
        version: { increment: 1 },
      },
    });
    if (to === 'CANCELLED')
      await this.repo.db.campaignRecipient.updateMany({
        where: { campaignId: id, status: 'PENDING' },
        data: { status: 'SKIPPED', errorCode: 'cancelled' },
      });
    await this.event(id, kind, label, c);
    return this.detail(c, id);
  }

  pause(c: CallerContext, id: string) {
    this.policy.assert(c, 'campaigns.launch');
    return this.transition(
      c,
      id,
      ['RUNNING', 'SCHEDULED'],
      'PAUSED',
      'PAUSED',
      'أُوقفت الحملة مؤقتًا',
      'لا يمكن إيقاف حملة غير جارية.',
    );
  }

  resume(c: CallerContext, id: string) {
    this.policy.assert(c, 'campaigns.launch');
    return this.transition(
      c,
      id,
      ['PAUSED'],
      'RUNNING',
      'RESUMED',
      'استُؤنف إرسال الحملة',
      'لا يمكن استئناف حملة غير موقوفة.',
    );
  }

  cancel(c: CallerContext, id: string) {
    this.policy.assert(c, 'campaigns.launch');
    return this.transition(
      c,
      id,
      ['RUNNING', 'SCHEDULED', 'PAUSED'],
      'CANCELLED',
      'CANCELLED',
      'أُلغيت الحملة',
      'لا يمكن إلغاء حملة مكتملة أو ملغاة.',
    );
  }

  // ---------------------------------------------------------------- recipients

  async recipients(c: CallerContext, id: string, q: RecipientListDto) {
    const campaign = await this.visible(c, id);
    const fingerprint = this.repo.fingerprint(q);
    const cursor = this.repo.decode(q.cursor, fingerprint);
    const snapshotAt = cursor?.snapshotAt ?? new Date().toISOString();
    const search = q.search.trim();
    const digits = normalizePhone(search);
    const base: Prisma.CampaignRecipientWhereInput = {
      campaignId: campaign.id,
      createdAt: { lte: new Date(snapshotAt) },
      ...(q.status ? { status: RECIPIENT_DB[q.status] } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              ...(digits ? [{ normalizedPhone: { contains: digits } }] : []),
            ],
          }
        : {}),
    };
    const rows = await this.repo.db.campaignRecipient.findMany({
      where: { AND: [base, this.repo.cursorWhere(cursor)] },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
    });
    const total = await this.repo.db.campaignRecipient.count({ where: base });
    const hasMore = rows.length > q.limit;
    const items = rows.slice(0, q.limit);
    const last = items.at(-1);
    return {
      items: items.map((row) => ({
        id: row.id,
        contactId: row.contactId ?? undefined,
        name: row.name,
        phone: row.phone,
        status: RECIPIENT_WIRE[row.status],
        attempts: row.attempts,
        errorCode: row.errorCode ?? undefined,
        errorMessage: row.errorMessage ?? undefined,
        sentAt: row.sentAt?.toISOString(),
        deliveredAt: row.deliveredAt?.toISOString(),
        readAt: row.readAt?.toISOString(),
        failedAt: row.failedAt?.toISOString(),
      })),
      total,
      nextCursor:
        hasMore && last
          ? this.repo.encode({
              v: 1,
              fingerprint,
              id: last.id,
              snapshotAt,
              createdAt: last.createdAt.toISOString(),
            })
          : null,
    };
  }

  async exportRecipientsCsv(c: CallerContext, id: string): Promise<string> {
    this.policy.assert(c, 'campaigns.view');
    const campaign = await this.visible(c, id);
    const rows = await this.repo.db.campaignRecipient.findMany({
      where: { campaignId: campaign.id },
      orderBy: { createdAt: 'asc' },
      take: 50_000,
    });
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const header = [
      'name',
      'phone',
      'status',
      'attempts',
      'sentAt',
      'deliveredAt',
      'readAt',
      'errorCode',
      'errorMessage',
    ];
    return [
      header.join(','),
      ...rows.map((row) =>
        [
          row.name,
          row.phone,
          RECIPIENT_WIRE[row.status],
          String(row.attempts),
          row.sentAt?.toISOString() ?? '',
          row.deliveredAt?.toISOString() ?? '',
          row.readAt?.toISOString() ?? '',
          row.errorCode ?? '',
          row.errorMessage ?? '',
        ]
          .map(escape)
          .join(','),
      ),
    ].join('\n');
  }

  // -------------------------------------------------------------------- extras

  /** Renders the template with a campaign's bindings against one contact. */
  async preview(c: CallerContext, id: string) {
    const campaign = await this.visible(c, id);
    const contacts = await this.audienceContacts(
      c,
      campaign.organizationId,
      campaign.audiences.map((audience) => audience.groupId),
      [],
    );
    const contact = contacts[0];
    const bodyTokens = parsePlaceholders(campaign.template.bodyText);
    const headerTokens = parsePlaceholders(campaign.template.headerText ?? '');
    const values = contact
      ? new Map(
          contact.customValues.map((value) => [value.fieldId, value.value]),
        )
      : new Map<string, string>();
    const render = (bindings: VariableBinding[]) =>
      bindings.map((binding) =>
        contact
          ? this.resolve(binding, contact, values)
          : sanitize(
              binding.source === 'literal' ? binding.value : binding.fallback,
            ),
      );
    const bodyValues = render(this.bindings(campaign.variableMap));
    const headerValues = render(this.bindings(campaign.headerVariableMap));
    return {
      contactName: contact?.name,
      header: campaign.template.headerText
        ? renderPreview(
            campaign.template.headerText,
            headerValues,
            headerTokens,
          )
        : undefined,
      body: renderPreview(campaign.template.bodyText, bodyValues, bodyTokens),
      footer: campaign.template.footerText ?? undefined,
    };
  }

  /** Sends one message to a number the operator controls, before launching. */
  async testSend(c: CallerContext, id: string, dto: TestSendDto) {
    this.policy.assert(c, 'campaigns.launch');
    const campaign = await this.visible(c, id);
    if (campaign.template.status !== 'APPROVED')
      throw new DomainException(
        'template-not-approved',
        'لا يمكن الإرسال التجريبي بقالب غير معتمد من Meta.',
        422,
      );
    this.assertBindings(
      campaign.template,
      {
        ...({} as CampaignDraftDto),
        variables: this.bindings(campaign.variableMap),
        headerVariables: this.bindings(campaign.headerVariableMap),
      },
      await this.fieldIds(campaign.organizationId),
    );
    const to = normalizePhone(dto.phone);
    if (!to)
      throw new DomainException('phone-invalid', 'رقم الهاتف غير صالح', 422);
    const channel = await this.sender.channel(campaign.organizationId);
    const sample = (bindings: VariableBinding[]) =>
      bindings.map(
        (binding) =>
          sanitize(
            binding.source === 'literal' ? binding.value : binding.fallback,
          ) || 'نموذج',
      );
    const reference = await this.sender.send(
      {
        organizationId: campaign.organizationId,
        to,
        templateName: campaign.template.name,
        language: campaign.template.language,
        bodyTokens: parsePlaceholders(campaign.template.bodyText),
        bodyValues: sample(this.bindings(campaign.variableMap)),
        headerTokens: parsePlaceholders(campaign.template.headerText ?? ''),
        headerValues: sample(this.bindings(campaign.headerVariableMap)),
      },
      channel,
    );
    await this.event(id, 'UPDATED', `أُرسلت رسالة تجريبية إلى ${dto.phone}`, c);
    return { providerMessageId: reference };
  }

  /**
   * Turns an uploaded file into an audience: the rows become contacts (new ones
   * created, known numbers linked) inside a group the campaign can target.
   */
  async importAudience(c: CallerContext, dto: ImportAudienceDto) {
    this.policy.assert(c, 'campaigns.create');
    this.policy.assert(c, 'contacts.import');
    const organizationId = await this.repo.organizationId();
    const normalized = normalizeName(dto.groupName);
    const group =
      (await this.repo.db.contactGroup.findFirst({
        where: { organizationId, normalizedName: normalized },
      })) ??
      (await this.repo.db.contactGroup.create({
        data: {
          organizationId,
          name: dto.groupName,
          normalizedName: normalized,
          description: 'مجموعة أُنشئت من ملف حملة',
        },
      }));
    if (!group.active)
      await this.repo.db.contactGroup.update({
        where: { id: group.id },
        data: { active: true },
      });
    const outcome = await this.contacts.import(c, {
      rows: dto.rows,
      groupId: group.id,
    });
    return {
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        memberCount: outcome.contactIds.length,
      },
      imported: outcome.imported,
      linked: outcome.linked,
      skipped: outcome.skipped,
    };
  }
}
