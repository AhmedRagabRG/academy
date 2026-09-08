import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../prisma/generated/client';
import type {
  ContactSource,
  LeadPriority,
} from '../../../prisma/generated/client';
import {
  DomainException,
  NotFoundException,
  VersionConflictException,
} from '../../core/exceptions';
import { PrismaService } from '../../database/prisma.service';
import type { CallerContext } from '../../shared/types/caller-context';
import { fromMinorUnits, toMinorUnits } from '../../shared/utils/money.util';
import { normalizeArabic } from '../../shared/utils/arabic-normalize';
import { LeadPolicy } from './lead.policy';
import type {
  AssignLeadDto,
  LeadDraftDto,
  LeadListDto,
  LeadPriorityCode,
  MoveLeadDto,
  UpdateLeadDto,
} from './dto/lead.dto';

const PRIORITY_DB: Record<LeadPriorityCode, LeadPriority> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  urgent: 'URGENT',
};
const priorityWire = (value: LeadPriority): LeadPriorityCode =>
  value.toLowerCase() as LeadPriorityCode;

/** Contacts imported manually surface as "manual" in the pipeline filters. */
const leadSource = (value: ContactSource): string =>
  value === 'IMPORT' ? 'manual' : value.toLowerCase();

/** Inverse of `leadSource`: filtering on "manual" must also catch imports. */
const contactSources = (values: string[]): ContactSource[] =>
  values.flatMap((value) =>
    value === 'manual'
      ? (['MANUAL', 'IMPORT'] as ContactSource[])
      : [value.toUpperCase() as ContactSource],
  );

const aggregateInclude = {
  contact: true,
  stage: true,
  assignedAgent: { select: { id: true, displayName: true } },
  activities: {
    orderBy: [{ occurredAt: 'desc' as const }, { id: 'desc' as const }],
  },
} satisfies Prisma.LeadInclude;
type Aggregate = Prisma.LeadGetPayload<{ include: typeof aggregateInclude }>;

export interface ChannelLeadIntake {
  organizationId: string;
  contactId: string;
  occurredAt: Date;
  program?: string;
}

@Injectable()
export class LeadService {
  constructor(
    private readonly db: PrismaService,
    private readonly policy: LeadPolicy,
  ) {}

  private async organizationId(): Promise<string> {
    return (
      await this.db.organization.findFirstOrThrow({ select: { id: true } })
    ).id;
  }

  private async currency(organizationId: string): Promise<string> {
    const settings = await this.db.generalSettings.findFirst({
      where: { organizationId },
      select: { currency: true },
    });
    return settings?.currency ?? 'EGP';
  }

  private project(row: Aggregate) {
    return {
      id: row.id,
      pipelineId: row.pipelineId,
      contactId: row.contactId,
      contactName: row.contact.name,
      phone: row.contact.phone,
      email: row.contact.email ?? undefined,
      source: leadSource(row.contact.source),
      stageId: row.stage.code,
      stageRecordId: row.stageId,
      assignedAgentId: row.assignedAgentId ?? undefined,
      assignedAgentName: row.assignedAgent?.displayName ?? undefined,
      priority: priorityWire(row.priority),
      value: Number(
        fromMinorUnits(row.valueMinor, row.currency, row.precision).amount,
      ),
      currency: row.currency,
      program: row.program,
      outcome: row.outcome.toLowerCase(),
      nextActionAt: row.nextActionAt?.toISOString(),
      closedAt: row.closedAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      version: row.version,
      activities: row.activities.map((activity) => ({
        id: activity.id,
        type:
          activity.kind === 'STAGE_CHANGED'
            ? 'stage_changed'
            : activity.kind.toLowerCase(),
        label: activity.label,
        actorName: activity.actorName,
        occurredAt: activity.occurredAt.toISOString(),
      })),
    };
  }

  /** The organization's default pipeline, seeded on first use. */
  async definition(c: CallerContext, pipelineId?: string) {
    this.policy.assert(c, 'pipeline.view');
    const pipeline = await this.pipeline(pipelineId);
    return {
      id: pipeline.id,
      code: pipeline.code,
      name: pipeline.name,
      stages: pipeline.stages.map((stage) => ({
        id: stage.code,
        recordId: stage.id,
        name: stage.name,
        description: stage.description,
        probability: stage.probability,
        accent: stage.accent,
        outcome: stage.outcome.toLowerCase(),
        position: stage.position,
      })),
    };
  }

  private async pipeline(pipelineId?: string) {
    const organizationId = await this.organizationId();
    const pipeline = await this.db.pipeline.findFirst({
      where: {
        organizationId,
        active: true,
        ...(pipelineId ? { id: pipelineId } : { isDefault: true }),
      },
      include: { stages: { orderBy: { position: 'asc' } } },
    });
    if (!pipeline)
      throw new DomainException(
        'pipeline-not-configured',
        'لم يتم إعداد مسار المبيعات بعد',
        409,
      );
    return pipeline;
  }

  async agents(c: CallerContext) {
    this.policy.assert(c, 'pipeline.view');
    const rows = await this.db.account.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: { normalizedDisplayName: 'asc' },
      select: { id: true, displayName: true },
    });
    return rows.map((row) => ({ id: row.id, name: row.displayName }));
  }

  async list(c: CallerContext, q: LeadListDto) {
    const scope = this.policy.scope(c);
    const pipeline = await this.pipeline(q.pipelineId);
    const search = q.search.trim();
    const digits = search.replace(/\D/g, '');
    const rows = await this.db.lead.findMany({
      where: {
        organizationId: pipeline.organizationId,
        pipelineId: pipeline.id,
        deletedAt: null,
        AND: [
          scope,
          q.agentId ? { assignedAgentId: q.agentId } : {},
          q.priority ? { priority: PRIORITY_DB[q.priority] } : {},
          q.outcome
            ? { outcome: q.outcome.toUpperCase() as 'OPEN' | 'WON' | 'LOST' }
            : {},
          q.stageIds.length ? { stageId: { in: q.stageIds } } : {},
          q.sources.length
            ? { contact: { source: { in: contactSources(q.sources) } } }
            : {},
          search
            ? {
                contact: {
                  OR: [
                    {
                      normalizedName: {
                        contains: normalizeArabic(search).toLocaleLowerCase(),
                      },
                    },
                    ...(digits
                      ? [{ normalizedPhone: { contains: digits } }]
                      : []),
                  ],
                },
              }
            : {},
        ],
      },
      include: aggregateInclude,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: q.limit,
    });
    return { items: rows.map((row) => this.project(row)), total: rows.length };
  }

  private async visible(c: CallerContext, id: string): Promise<Aggregate> {
    const row = await this.db.lead.findFirst({
      where: { id, deletedAt: null, AND: [this.policy.scope(c)] },
      include: aggregateInclude,
    });
    this.policy.assertVisible(row);
    return row;
  }

  async detail(c: CallerContext, id: string) {
    return this.project(await this.visible(c, id));
  }

  private activity(
    kind: 'CREATED' | 'STAGE_CHANGED' | 'ASSIGNED' | 'UPDATED' | 'NOTE',
    label: string,
    actor: { id?: string; name: string },
    payload?: Prisma.InputJsonValue,
  ) {
    return {
      kind,
      label,
      actorId: actor.id ?? null,
      actorName: actor.name,
      ...(payload ? { payload } : {}),
    };
  }

  private amount(value: string, currency: string, precision: number): bigint {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0)
      throw new DomainException('value-invalid', 'القيمة غير صالحة', 422);
    return toMinorUnits({
      amount: numeric.toFixed(precision),
      currency,
      precision,
    });
  }

  private async agent(c: CallerContext, agentId: string | null | undefined) {
    if (!agentId) return null;
    const account = await this.db.account.findFirst({
      where: { id: agentId, status: 'ACTIVE' },
      select: { id: true, displayName: true },
    });
    if (!account)
      throw new DomainException('agent-invalid', 'الموظف غير صالح', 422);
    return account;
  }

  async create(c: CallerContext, dto: LeadDraftDto) {
    this.policy.assert(c, 'pipeline.create');
    if (dto.assignedAgentId) this.policy.assert(c, 'pipeline.assign');
    const pipeline = await this.pipeline(dto.pipelineId);
    const contact = await this.db.contact.findFirst({
      where: {
        id: dto.contactId,
        organizationId: pipeline.organizationId,
        deletedAt: null,
      },
    });
    if (!contact)
      throw new DomainException(
        'contact-invalid',
        'جهة الاتصال غير صالحة',
        422,
      );
    const agent = await this.agent(c, dto.assignedAgentId);
    const entry =
      (dto.stageId &&
        pipeline.stages.find((stage) => stage.id === dto.stageId)) ||
      pipeline.stages.find((stage) =>
        agent ? stage.code === 'new' : stage.isEntry,
      ) ||
      pipeline.stages[0];
    const currency = await this.currency(pipeline.organizationId);
    const precision = 2;
    const row = await this.db.lead.create({
      data: {
        organizationId: pipeline.organizationId,
        pipelineId: pipeline.id,
        stageId: entry.id,
        contactId: contact.id,
        assignedAgentId: agent?.id ?? null,
        priority: PRIORITY_DB[dto.priority],
        valueMinor: this.amount(dto.value || '0', currency, precision),
        currency,
        precision,
        program: dto.program,
        nextActionAt: dto.nextActionAt ? new Date(dto.nextActionAt) : null,
        createdBy: c.accountId,
        updatedBy: c.accountId,
        activities: {
          create: this.activity('CREATED', 'أُنشئت الفرصة من جهة الاتصال', {
            id: c.accountId,
            name: c.displayName,
          }),
        },
      },
      include: aggregateInclude,
    });
    return this.project(row);
  }

  async update(c: CallerContext, id: string, dto: UpdateLeadDto) {
    this.policy.assert(c, 'pipeline.update');
    const current = await this.visible(c, id);
    if (dto.expectedVersion && dto.expectedVersion !== current.version)
      throw new VersionConflictException(current.version);
    const agentChanged =
      dto.assignedAgentId !== undefined &&
      dto.assignedAgentId !== current.assignedAgentId;
    if (agentChanged) this.policy.assert(c, 'pipeline.assign');
    const agent = agentChanged
      ? await this.agent(c, dto.assignedAgentId)
      : null;
    const row = await this.db.lead.update({
      where: { id },
      data: {
        ...(agentChanged ? { assignedAgentId: agent?.id ?? null } : {}),
        ...(dto.priority ? { priority: PRIORITY_DB[dto.priority] } : {}),
        ...(dto.value !== undefined
          ? {
              valueMinor: this.amount(
                dto.value,
                current.currency,
                current.precision,
              ),
            }
          : {}),
        ...(dto.program !== undefined ? { program: dto.program } : {}),
        ...(dto.nextActionAt !== undefined
          ? {
              nextActionAt: dto.nextActionAt
                ? new Date(dto.nextActionAt)
                : null,
            }
          : {}),
        updatedBy: c.accountId,
        version: { increment: 1 },
        activities: {
          create: this.activity('UPDATED', 'حُدثت بيانات الفرصة', {
            id: c.accountId,
            name: c.displayName,
          }),
        },
      },
      include: aggregateInclude,
    });
    return this.project(row);
  }

  async move(c: CallerContext, id: string, dto: MoveLeadDto) {
    this.policy.assert(c, 'pipeline.move');
    const current = await this.visible(c, id);
    if (dto.expectedVersion && dto.expectedVersion !== current.version)
      throw new VersionConflictException(current.version);
    const stage = await this.db.pipelineStage.findFirst({
      where: { id: dto.stageId, pipelineId: current.pipelineId, active: true },
    });
    if (!stage)
      throw new DomainException('stage-invalid', 'المرحلة غير صالحة', 422);
    if (stage.id === current.stageId) return this.project(current);
    const closing = stage.outcome !== 'OPEN';
    const row = await this.db.lead.update({
      where: { id },
      data: {
        stageId: stage.id,
        outcome: stage.outcome,
        closedAt: closing ? new Date() : null,
        closeReason: closing ? dto.reason || null : null,
        updatedBy: c.accountId,
        version: { increment: 1 },
        activities: {
          create: this.activity(
            'STAGE_CHANGED',
            `نُقلت الفرصة إلى «${stage.name}»`,
            { id: c.accountId, name: c.displayName },
            { from: current.stage.code, to: stage.code },
          ),
        },
      },
      include: aggregateInclude,
    });
    return this.project(row);
  }

  async assign(c: CallerContext, id: string, dto: AssignLeadDto) {
    this.policy.assert(c, 'pipeline.assign');
    const current = await this.visible(c, id);
    const agent = await this.agent(c, dto.assignedAgentId);
    if ((agent?.id ?? null) === current.assignedAgentId)
      return this.project(current);
    const row = await this.db.lead.update({
      where: { id },
      data: {
        assignedAgentId: agent?.id ?? null,
        updatedBy: c.accountId,
        version: { increment: 1 },
        activities: {
          create: this.activity(
            'ASSIGNED',
            agent
              ? `أُسندت الفرصة إلى ${agent.displayName}`
              : 'أُلغي إسناد الفرصة',
            { id: c.accountId, name: c.displayName },
          ),
        },
      },
      include: aggregateInclude,
    });
    return this.project(row);
  }

  async addNote(c: CallerContext, id: string, content: string) {
    this.policy.assert(c, 'pipeline.update');
    await this.visible(c, id);
    const value = content.trim();
    if (!value) throw new DomainException('validation', 'اكتب الملاحظة', 422);
    const row = await this.db.lead.update({
      where: { id },
      data: {
        version: { increment: 1 },
        activities: {
          create: this.activity('NOTE', value, {
            id: c.accountId,
            name: c.displayName,
          }),
        },
      },
      include: aggregateInclude,
    });
    return this.project(row);
  }

  async remove(c: CallerContext, id: string): Promise<void> {
    this.policy.assert(c, 'pipeline.manage');
    await this.visible(c, id);
    await this.db.lead.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: c.accountId,
        version: { increment: 1 },
      },
    });
  }

  async board(c: CallerContext, q: LeadListDto) {
    const definition = await this.definition(c, q.pipelineId);
    const leads = await this.list(c, q);
    const byStage = new Map<string, typeof leads.items>();
    for (const lead of leads.items) {
      const bucket = byStage.get(lead.stageId) ?? [];
      bucket.push(lead);
      byStage.set(lead.stageId, bucket);
    }
    return {
      pipeline: definition,
      columns: definition.stages.map((stage) => {
        const items = byStage.get(stage.id) ?? [];
        return {
          stageId: stage.id,
          stageRecordId: stage.recordId,
          count: items.length,
          value: items.reduce((total, lead) => total + lead.value, 0),
          leads: items,
        };
      }),
      total: leads.total,
    };
  }

  /**
   * Guarantees a pipeline entry for a contact that just reached us through a
   * channel. An already open lead is reused so a returning customer does not
   * fragment into duplicate opportunities.
   */
  async ensureFromChannel(intake: ChannelLeadIntake) {
    const pipeline = await this.db.pipeline.findFirst({
      where: {
        organizationId: intake.organizationId,
        active: true,
        isDefault: true,
      },
      include: { stages: { orderBy: { position: 'asc' } } },
    });
    if (!pipeline) return null;
    const entry =
      pipeline.stages.find((stage) => stage.isEntry) ?? pipeline.stages[0];
    if (!entry) return null;
    const currency = await this.currency(intake.organizationId);
    // Serializable isolation turns two simultaneous "none found, create"
    // paths into one winner plus a retry. The retry then observes and reuses
    // the winner without imposing a new global uniqueness rule on manually
    // managed pipeline history.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.db.$transaction(
          async (tx) => {
            const existing = await tx.lead.findFirst({
              where: {
                pipelineId: pipeline.id,
                contactId: intake.contactId,
                deletedAt: null,
                outcome: 'OPEN',
              },
              orderBy: { createdAt: 'desc' },
            });
            if (existing) return existing;
            return tx.lead.create({
              data: {
                organizationId: intake.organizationId,
                pipelineId: pipeline.id,
                stageId: entry.id,
                contactId: intake.contactId,
                priority: 'MEDIUM',
                currency,
                precision: 2,
                program: intake.program ?? 'استفسار جديد من صندوق الوارد',
                createdAt: intake.occurredAt,
                activities: {
                  create: {
                    kind: 'CREATED',
                    label: 'أُنشئت الفرصة تلقائيًا من أول تواصل',
                    actorName: 'النظام',
                    occurredAt: intake.occurredAt,
                  },
                },
              },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (
          attempt === 0 &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034'
        )
          continue;
        throw error;
      }
    }
    throw new Error('Unreachable lead intake retry state');
  }

  async openLeadForContact(contactId: string) {
    return this.db.lead.findFirst({
      where: { contactId, deletedAt: null, outcome: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, stageId: true, pipelineId: true },
    });
  }
}

export type { NotFoundException };
