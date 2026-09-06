import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma, Ticket } from '../../../prisma/generated/client';
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
import { uploadConstraint } from '../../storage/upload.constraints';
import { TicketRepository } from './ticket.repository';
import { TicketPolicy } from './ticket.policy';
import type {
  AssignmentDto,
  CreateTicketDto,
  TicketListDto,
  UpdateTicketDto,
} from './dto/ticket.dto';

const statuses = [
  'backlog',
  'todo',
  'in-progress',
  'waiting',
  'review',
  'done',
] as const;
const priorities = ['low', 'medium', 'high', 'critical'] as const;
const priorityRank = (priority: string) =>
  priorities.indexOf(priority as (typeof priorities)[number]) + 1;
const dbStatus = (v: string) =>
  v.replace('-', '_').toUpperCase() as Ticket['status'];
const wire = (v: string) => v.toLowerCase().replace('_', '-');
type Aggregate = Prisma.TicketGetPayload<{
  include: { comments: true; activities: true; attachments: true };
}>;
interface ProjectionReferences {
  teams: Map<string, string>;
  employees: Map<string, string>;
  students: Map<string, string>;
  customers: Map<string, string>;
  commentCounts: Map<string, number>;
}

@Injectable()
export class TicketService {
  constructor(
    private readonly repo: TicketRepository,
    private readonly policy: TicketPolicy,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}
  private async full(id: string) {
    return this.repo.db.ticket.findUnique({
      where: { id },
      include: {
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        activities: { orderBy: { sequence: 'desc' }, take: 20 },
        attachments: { orderBy: { uploadedAt: 'desc' } },
      },
    });
  }
  private caps(c: CallerContext, archived: boolean) {
    const h = (p: string) => this.policy.has(c, p);
    return {
      edit: h('tickets.edit'),
      changeStatus: h('tickets.change.status'),
      changePriority: h('tickets.change.priority'),
      assignTeam: h('tickets.assign.team'),
      assignEmployee: h('tickets.assign.employee'),
      comment: h('tickets.comment'),
      attach: h('tickets.attach.files'),
      archive: !archived && h('tickets.archive'),
      restore: archived && h('tickets.restore'),
      delete: h('tickets.delete'),
    };
  }
  private async project(
    row: Aggregate,
    c: CallerContext,
    references?: ProjectionReferences,
  ) {
    const [team, employee] =
      await Promise.all([
        row.teamId && !references
          ? this.repo.db.ticketTeam.findUnique({
              where: { id: row.teamId },
              select: { name: true },
            })
          : null,
        row.employeeId && !references
          ? this.repo.db.account.findUnique({
              where: { id: row.employeeId },
              select: { displayName: true },
            })
          : null,
      ]);
    return {
      id: row.id,
      organizationId: row.organizationId,
      number: row.number,
      title: row.title,
      description: row.description,
      status: wire(row.status),
      lastActiveStatus: wire(row.lastActiveStatus),
      priority: wire(row.priority),
      teamId: row.teamId ?? undefined,
      employeeId: row.employeeId ?? undefined,
      customerId: row.customerId ?? undefined,
      studentId: row.studentId ?? undefined,
      conversationId: row.conversationId ?? undefined,
      dueAt: row.dueAt?.toISOString(),
      tags: row.tags,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      completedAt: row.completedAt?.toISOString(),
      version: row.version,
      teamName: row.teamId
        ? (references?.teams.get(row.teamId) ?? team?.name)
        : undefined,
      employeeName: row.employeeId
        ? (references?.employees.get(row.employeeId) ?? employee?.displayName)
        : undefined,
      customerName: row.customerId
        ? (references?.customers.get(row.customerId) ?? undefined)
        : undefined,
      studentName: row.studentId
        ? (references?.students.get(row.studentId) ?? undefined)
        : undefined,
      commentCount:
        references?.commentCounts.get(row.id) ?? row.comments.length,
      capabilities: this.caps(c, row.status === 'ARCHIVED'),
      comments: row.comments.map((x) => ({
        id: x.id,
        ticketId: x.ticketId,
        authorId: x.authorId,
        authorName: x.authorName,
        message: x.message,
        createdAt: x.createdAt.toISOString(),
        updatedAt: x.updatedAt?.toISOString(),
      })),
      activity: row.activities.map((x) => ({
        id: x.id,
        ticketId: x.ticketId,
        sequence: x.sequence,
        type: x.type,
        actorId: x.actorId,
        actorName: x.actorName,
        occurredAt: x.occurredAt.toISOString(),
        message: x.message,
        payload: x.payload,
      })),
      attachments: row.attachments.map((x) => this.attachment(x)),
    };
  }
  private attachment(x: {
    id: string;
    ticketId: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy: string;
    uploadedAt: Date;
  }) {
    return {
      id: x.id,
      ticketId: x.ticketId,
      name: x.name,
      mimeType: x.mimeType,
      sizeBytes: x.sizeBytes,
      uploadedBy: x.uploadedBy,
      uploadedAt: x.uploadedAt.toISOString(),
      previewUrl: `/api/v1/tickets/${x.ticketId}/attachments/${x.id}`,
    };
  }
  private async assertRefs(
    org: string,
    dto: Partial<CreateTicketDto> | AssignmentDto,
  ) {
    if (
      dto.teamId &&
      !(await this.repo.db.ticketTeam.findFirst({
        where: { id: dto.teamId, organizationId: org, active: true },
      }))
    )
      throw new DomainException('team-inactive', 'الفريق غير صالح', 422);
    if (
      dto.employeeId &&
      !(await this.repo.db.account.findFirst({
        where: { id: dto.employeeId, status: 'ACTIVE' },
      }))
    )
      throw new DomainException('employee-inactive', 'الموظف غير صالح', 422);
    if (
      dto.teamId &&
      dto.employeeId &&
      !(await this.repo.db.ticketTeamMembership.findFirst({
        where: { teamId: dto.teamId, employeeId: dto.employeeId, active: true },
      }))
    )
      throw new DomainException(
        'assignment-mismatch',
        'الموظف ليس عضواً نشطاً في الفريق',
        422,
      );
  }
  private assertActive(ticket: Ticket) {
    if (ticket.status === 'ARCHIVED' || ticket.archivedAt)
      throw new DomainException(
        'invalid-transition',
        'لا يمكن تعديل تذكرة مؤرشفة',
        409,
      );
  }
  async configuration(c: CallerContext) {
    this.policy.assertAnyView(c);
    const org = await this.repo.organizationId();
    const scope = await this.repo.scopedWhere(c);
    const scopedTickets = await this.repo.db.ticket.findMany({
      where: { organizationId: org, deletedAt: null, ...scope },
      select: {
        teamId: true,
        employeeId: true,
        customerId: true,
        studentId: true,
        tags: true,
      },
    });
    const scopedIds = (
      key: 'teamId' | 'employeeId' | 'customerId' | 'studentId',
    ) =>
      [
        ...new Set(scopedTickets.map((ticket) => ticket[key]).filter(Boolean)),
      ] as string[];
    const [teams, employees] =
      await Promise.all([
        this.repo.db.ticketTeam.findMany({
          where: {
            organizationId: org,
            active: true,
            id: { in: scopedIds('teamId') },
          },
          select: { id: true, name: true },
        }),
        this.repo.db.account.findMany({
          where: { status: 'ACTIVE', id: { in: scopedIds('employeeId') } },
          select: { id: true, displayName: true },
        }),
      ]);
    const memberships = await this.repo.db.ticketTeamMembership.findMany({
      where: { active: true },
    });
    const limit = this.config.getOrThrow<number>('upload.maxBytes');
    return {
      statuses: statuses.map((id, order) => ({ id, name: id, order })),
      priorities: priorities.map((id, order) => ({
        id,
        name: id,
        tone: id,
        order,
      })),
      teams,
      employees: employees.map((e) => ({
        id: e.id,
        name: e.displayName,
        teamIds: memberships
          .filter((m) => m.employeeId === e.id)
          .map((m) => m.teamId),
      })),
      customers: [],
      students: [],
      conversations: [],
      tags: [...new Set(scopedTickets.flatMap((x) => x.tags))],
      attachment: uploadConstraint('ticket-attachment', limit),
    };
  }
  async list(c: CallerContext, q: TicketListDto) {
    const org = await this.repo.organizationId();
    const fingerprint = this.repo.fingerprint(q);
    const cursor = this.repo.decode(q.cursor, fingerprint, q.sort);
    const snapshotAt = cursor?.snapshotAt ?? new Date().toISOString();
    const search = q.search?.trim();
    const cursorWhere: Prisma.TicketWhereInput | undefined = cursor
      ? q.sort === 'oldest'
        ? {
            OR: [
              { createdAt: { gt: new Date(cursor.createdAt!) } },
              {
                createdAt: new Date(cursor.createdAt!),
                id: { gt: cursor.id },
              },
            ],
          }
        : q.sort === 'newest'
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.createdAt!) } },
                {
                  createdAt: new Date(cursor.createdAt!),
                  id: { gt: cursor.id },
                },
              ],
            }
          : q.sort === 'priority'
            ? {
                OR: [
                  { priorityRank: { lt: cursor.priorityRank } },
                  {
                    priorityRank: cursor.priorityRank,
                    updatedAt: { lt: new Date(cursor.updatedAt!) },
                  },
                  {
                    priorityRank: cursor.priorityRank,
                    updatedAt: new Date(cursor.updatedAt!),
                    id: { gt: cursor.id },
                  },
                ],
              }
            : {
                OR: [
                  { updatedAt: { lt: new Date(cursor.updatedAt!) } },
                  {
                    updatedAt: new Date(cursor.updatedAt!),
                    number: { lt: cursor.number! },
                  },
                  {
                    updatedAt: new Date(cursor.updatedAt!),
                    number: cursor.number!,
                    id: { gt: cursor.id },
                  },
                ],
              }
      : undefined;
    const where: Prisma.TicketWhereInput = {
      AND: [
        await this.repo.scopedWhere(c),
        ...(cursorWhere ? [cursorWhere] : []),
      ],
      organizationId: org,
      deletedAt: null,
      updatedAt: { lte: new Date(snapshotAt) },
      archivedAt: q.mode === 'archived' ? { not: null } : null,
      ...(q.status?.length ? { status: { in: q.status.map(dbStatus) } } : {}),
      ...(q.priority?.length
        ? {
            priority: {
              in: q.priority.map((x) => x.toUpperCase() as Ticket['priority']),
            },
          }
        : {}),
      ...(q.teamId ? { teamId: { in: q.teamId } } : {}),
      ...(q.employeeId ? { employeeId: { in: q.employeeId } } : {}),
      ...(q.tag ? { tags: { hasSome: q.tag } } : {}),
      ...(q.createdBy ? { createdBy: { in: q.createdBy } } : {}),
      ...(search
        ? {
            OR: [
              { number: { contains: search, mode: 'insensitive' } },
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { tags: { has: search } },
            ],
          }
        : {}),
    };
    const orderBy: Prisma.TicketOrderByWithRelationInput[] =
      q.sort === 'oldest'
        ? [{ createdAt: 'asc' }, { id: 'asc' }]
        : q.sort === 'newest'
          ? [{ createdAt: 'desc' }, { id: 'asc' }]
          : q.sort === 'priority'
            ? [{ priorityRank: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }]
            : [{ updatedAt: 'desc' }, { number: 'desc' }, { id: 'asc' }];
    const [rows, total] = await Promise.all([
      this.repo.db.ticket.findMany({
        where,
        orderBy,
        take: q.pageSize + 1,
      }),
      this.repo.db.ticket.count({
        where: { ...where, AND: [await this.repo.scopedWhere(c)] },
      }),
    ]);
    const more = rows.length > q.pageSize;
    const slice = rows.slice(0, q.pageSize);
    const ids = <K extends keyof Ticket>(key: K) =>
      [...new Set(slice.map((row) => row[key]).filter(Boolean))] as string[];
    const [
      teams,
      employees,
      counts,
    ] = await Promise.all([
      this.repo.db.ticketTeam.findMany({
        where: { id: { in: ids('teamId') } },
        select: { id: true, name: true },
      }),
      this.repo.db.account.findMany({
        where: { id: { in: ids('employeeId') } },
        select: { id: true, displayName: true },
      }),
      this.repo.db.ticketComment.groupBy({
        by: ['ticketId'],
        where: { ticketId: { in: slice.map(({ id }) => id) }, deletedAt: null },
        _count: { _all: true },
      }),
    ]);
    const refs: ProjectionReferences = {
      teams: new Map(teams.map((x) => [x.id, x.name])),
      employees: new Map(employees.map((x) => [x.id, x.displayName])),
      students: new Map(),
      customers: new Map(),
      commentCounts: new Map(counts.map((x) => [x.ticketId, x._count._all])),
    };
    const last = slice.at(-1);
    return {
      items: await Promise.all(
        slice.map((x) =>
          this.project(
            { ...x, comments: [], activities: [], attachments: [] },
            c,
            refs,
          ),
        ),
      ),
      total,
      pageSize: q.pageSize,
      nextCursor:
        more && last
          ? this.repo.encode({
              v: 1,
              fingerprint,
              sort: q.sort,
              id: last.id,
              snapshotAt,
              createdAt: last.createdAt.toISOString(),
              updatedAt: last.updatedAt.toISOString(),
              number: last.number,
              priorityRank: last.priorityRank,
            })
          : undefined,
      queryFingerprint: fingerprint,
    };
  }
  async get(c: CallerContext, id: string) {
    this.policy.assertVisible(Boolean(await this.repo.visible(c, id)));
    const row = await this.full(id);
    if (!row) throw new NotFoundException();
    return this.project(row, c);
  }
  async dashboard(c: CallerContext) {
    const org = await this.repo.organizationId();
    const scope = await this.repo.scopedWhere(c);
    const base = {
      organizationId: org,
      deletedAt: null,
      archivedAt: null,
      ...scope,
    };
    const teams = await this.repo.teamIds(c);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [mine, team, open, waiting, critical, closedToday] =
      await Promise.all([
        this.repo.db.ticket.count({
          where: { ...base, employeeId: c.accountId },
        }),
        this.repo.db.ticket.count({
          where: { ...base, teamId: { in: teams } },
        }),
        this.repo.db.ticket.count({
          where: { ...base, status: { not: 'DONE' } },
        }),
        this.repo.db.ticket.count({ where: { ...base, status: 'WAITING' } }),
        this.repo.db.ticket.count({ where: { ...base, priority: 'CRITICAL' } }),
        this.repo.db.ticket.count({
          where: { ...base, status: 'DONE', completedAt: { gte: start } },
        }),
      ]);
    return { mine, team, open, waiting, critical, closedToday };
  }
  async create(c: CallerContext, dto: CreateTicketDto) {
    this.policy.assert(c, 'tickets.create');
    const org = await this.repo.organizationId();
    await this.assertRefs(org, dto);
    const row = await this.repo.db.$transaction(async (tx) => {
      const counter = await tx.ticketCounter.upsert({
        where: { organizationId: org },
        create: { organizationId: org, nextNumber: 1002 },
        update: { nextNumber: { increment: 1 } },
      });
      const ticket = await tx.ticket.create({
        data: {
          organizationId: org,
          number: `TKT-${counter.nextNumber - 1}`,
          title: dto.title.trim(),
          description: dto.description.trim(),
          status: dbStatus(dto.status),
          lastActiveStatus: dbStatus(dto.status),
          priority: dto.priority.toUpperCase() as Ticket['priority'],
          priorityRank: priorityRank(dto.priority),
          teamId: dto.teamId,
          employeeId: dto.employeeId,
          customerId: dto.customerId,
          studentId: dto.studentId,
          conversationId: dto.conversationId,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
          tags: dto.tags,
          createdBy: c.accountId,
          updatedBy: c.accountId,
          activitySequence: 1,
        },
      });
      await tx.ticketActivity.create({
        data: {
          ticketId: ticket.id,
          sequence: 1,
          type: 'created',
          actorId: c.accountId,
          actorName: c.displayName,
          message: 'تم إنشاء التذكرة',
          payload: JSON.parse(
            JSON.stringify({ after: dto }),
          ) as Prisma.InputJsonValue,
        },
      });
      return ticket;
    });
    const created = await this.full(row.id);
    if (!created) throw new NotFoundException();
    return this.project(created, c);
  }
  private async command(
    c: CallerContext,
    id: string,
    expectedVersion: number,
    permission: string,
    type: string,
    data: Prisma.TicketUpdateInput,
    before: object,
    after: object,
  ) {
    this.policy.assert(c, permission);
    const visible = await this.repo.visible(c, id);
    this.policy.assertVisible(Boolean(visible));
    if (!visible) throw new NotFoundException();
    if (visible.version !== expectedVersion)
      throw new VersionConflictException(visible.version);
    if (JSON.stringify(before) === JSON.stringify(after))
      throw new DomainException('no-op', 'لم يطرأ أي تغيير', 409);
    await this.repo.db.$transaction(async (tx) => {
      const updated = await tx.ticket.updateMany({
        where: { id, version: expectedVersion },
        data: {
          ...data,
          version: { increment: 1 },
          activitySequence: { increment: 1 },
          updatedBy: c.accountId,
        },
      });
      if (updated.count !== 1) {
        const current = await tx.ticket.findUnique({
          where: { id },
          select: { version: true },
        });
        throw new VersionConflictException(current?.version ?? expectedVersion);
      }
      await tx.ticketActivity.create({
        data: {
          ticketId: id,
          sequence: visible.activitySequence + 1,
          type,
          actorId: c.accountId,
          actorName: c.displayName,
          message: type,
          payload: { before, after },
        },
      });
    });
    const updated = await this.full(id);
    if (!updated) throw new NotFoundException();
    return this.project(updated, c);
  }
  async update(c: CallerContext, id: string, dto: UpdateTicketDto) {
    this.policy.assert(c, 'tickets.edit');
    const org = await this.repo.organizationId();
    await this.assertRefs(org, dto);
    const old = await this.repo.visible(c, id);
    this.policy.assertVisible(Boolean(old));
    if (!old) throw new NotFoundException();
    this.assertActive(old);
    const { expectedVersion, ...values } = dto;
    const data: Prisma.TicketUpdateInput = {
      ...values,
      dueAt: values.dueAt ? new Date(values.dueAt) : values.dueAt,
      title: values.title?.trim(),
      description: values.description?.trim(),
    };
    const before = Object.fromEntries(
      Object.keys(values).map((key) => {
        const value = old[key as keyof Ticket];
        return [key, value instanceof Date ? value.toISOString() : value];
      }),
    );
    const after = {
      ...values,
      ...(values.title ? { title: values.title.trim() } : {}),
      ...(values.description ? { description: values.description.trim() } : {}),
    };
    return this.command(
      c,
      id,
      expectedVersion,
      'tickets.edit',
      'updated',
      data,
      before,
      after,
    );
  }
  async status(c: CallerContext, id: string, status: string, version: number) {
    this.policy.assert(c, 'tickets.change.status');
    const old = await this.repo.visible(c, id);
    this.policy.assertVisible(Boolean(old));
    if (!old) throw new NotFoundException();
    this.assertActive(old);
    return this.command(
      c,
      id,
      version,
      'tickets.change.status',
      'status-changed',
      {
        status: dbStatus(status),
        lastActiveStatus: dbStatus(status),
        completedAt: status === 'done' ? new Date() : null,
      },
      { status: wire(old.status) },
      { status },
    );
  }
  async priority(
    c: CallerContext,
    id: string,
    priority: string,
    version: number,
  ) {
    this.policy.assert(c, 'tickets.change.priority');
    const old = await this.repo.visible(c, id);
    this.policy.assertVisible(Boolean(old));
    if (!old) throw new NotFoundException();
    this.assertActive(old);
    return this.command(
      c,
      id,
      version,
      'tickets.change.priority',
      'priority-changed',
      {
        priority: priority.toUpperCase() as Ticket['priority'],
        priorityRank: priorityRank(priority),
      },
      { priority: wire(old.priority) },
      { priority },
    );
  }
  async assignment(c: CallerContext, id: string, dto: AssignmentDto) {
    if (
      !this.policy.has(c, 'tickets.assign.team') &&
      !this.policy.has(c, 'tickets.assign.employee')
    )
      this.policy.assert(c, 'tickets.assign.team');
    const old = await this.repo.visible(c, id);
    this.policy.assertVisible(Boolean(old));
    if (!old) throw new NotFoundException();
    this.assertActive(old);
    const nextTeamId = dto.teamId ?? null;
    const nextEmployeeId = dto.employeeId ?? null;
    if (old.teamId !== nextTeamId) this.policy.assert(c, 'tickets.assign.team');
    if (old.employeeId !== nextEmployeeId)
      this.policy.assert(c, 'tickets.assign.employee');
    if (
      (old.teamId && old.teamId !== nextTeamId) ||
      (old.employeeId && old.employeeId !== nextEmployeeId)
    )
      this.policy.assert(c, 'tickets.reassign');
    await this.assertRefs(old.organizationId, dto);
    return this.command(
      c,
      id,
      dto.expectedVersion,
      old.employeeId !== nextEmployeeId
        ? 'tickets.assign.employee'
        : 'tickets.assign.team',
      'assignment-changed',
      { teamId: nextTeamId, employeeId: nextEmployeeId },
      { teamId: old.teamId, employeeId: old.employeeId },
      { teamId: nextTeamId, employeeId: nextEmployeeId },
    );
  }
  async archive(c: CallerContext, id: string, version: number) {
    this.policy.assert(c, 'tickets.archive');
    const old = await this.repo.visible(c, id);
    this.policy.assertVisible(Boolean(old));
    if (!old) throw new NotFoundException();
    this.assertActive(old);
    return this.command(
      c,
      id,
      version,
      'tickets.archive',
      'archived',
      {
        status: 'ARCHIVED',
        lastActiveStatus: old.status,
        archivedAt: new Date(),
      },
      { status: wire(old.status) },
      { status: 'archived' },
    );
  }
  async restore(c: CallerContext, id: string, version: number) {
    this.policy.assert(c, 'tickets.restore');
    const old = await this.repo.visible(c, id);
    this.policy.assertVisible(Boolean(old));
    if (!old) throw new NotFoundException();
    if (old.status !== 'ARCHIVED' || !old.archivedAt)
      throw new DomainException(
        'invalid-transition',
        'التذكرة غير مؤرشفة',
        409,
      );
    return this.command(
      c,
      id,
      version,
      'tickets.restore',
      'restored',
      {
        status:
          old.lastActiveStatus === 'ARCHIVED'
            ? 'BACKLOG'
            : old.lastActiveStatus,
        archivedAt: null,
      },
      { status: 'archived' },
      { status: wire(old.lastActiveStatus) },
    );
  }
  async remove(c: CallerContext, id: string, expectedVersion?: number) {
    this.policy.assert(c, 'tickets.delete');
    const old = await this.repo.visible(c, id);
    this.policy.assertVisible(Boolean(old));
    if (!old) throw new NotFoundException();
    if (expectedVersion !== undefined && old.version !== expectedVersion)
      throw new VersionConflictException(old.version);
    await this.repo.db.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          version: { increment: 1 },
          activitySequence: { increment: 1 },
          updatedBy: c.accountId,
        },
      });
      await tx.ticketActivity.create({
        data: {
          ticketId: id,
          sequence: old.activitySequence + 1,
          type: 'deleted',
          actorId: c.accountId,
          actorName: c.displayName,
          message: 'deleted',
          payload: {
            before: { deletedAt: null },
            after: { deletedAt: new Date().toISOString() },
          },
        },
      });
    });
  }
  async comments(
    c: CallerContext,
    id: string,
    pageSize: number,
    cursor?: string,
  ) {
    await this.get(c, id);
    let decoded: { id: string } | undefined;
    if (cursor) {
      try {
        decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString()) as {
          id: string;
        };
        if (typeof decoded.id !== 'string') throw new Error('shape');
      } catch {
        throw new DomainException(
          'cursor-invalid',
          'مؤشر الصفحة غير صالح',
          400,
        );
      }
    }
    const rows = await this.repo.db.ticketComment.findMany({
      where: { ticketId: id, deletedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      cursor: decoded ? { id: decoded.id } : undefined,
      skip: decoded ? 1 : 0,
      take: pageSize + 1,
    });
    const more = rows.length > pageSize;
    return {
      items: rows.slice(0, pageSize),
      total: await this.repo.db.ticketComment.count({
        where: { ticketId: id, deletedAt: null },
      }),
      pageSize,
      nextCursor: more
        ? Buffer.from(JSON.stringify({ id: rows[pageSize - 1].id })).toString(
            'base64url',
          )
        : undefined,
    };
  }
  async addComment(c: CallerContext, id: string, message: string) {
    this.policy.assert(c, 'tickets.comment');
    const old = await this.repo.visible(c, id);
    this.policy.assertVisible(Boolean(old));
    if (!old) throw new NotFoundException();
    this.assertActive(old);
    await this.repo.db.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id },
        data: {
          version: { increment: 1 },
          activitySequence: { increment: 1 },
          updatedBy: c.accountId,
        },
      });
      await tx.ticketComment.create({
        data: {
          ticketId: id,
          authorId: c.accountId,
          authorName: c.displayName,
          message: message.trim(),
        },
      });
      await tx.ticketActivity.create({
        data: {
          ticketId: id,
          sequence: updated.activitySequence,
          type: 'comment-added',
          actorId: c.accountId,
          actorName: c.displayName,
          message: 'comment-added',
          payload: {},
        },
      });
    });
    return this.get(c, id);
  }
  async editComment(
    c: CallerContext,
    id: string,
    commentId: string,
    message: string,
    remove = false,
  ) {
    this.policy.assert(c, 'tickets.comment');
    const ticket = await this.repo.visible(c, id);
    this.policy.assertVisible(Boolean(ticket));
    if (ticket) this.assertActive(ticket);
    const comment = await this.repo.db.ticketComment.findFirst({
      where: { id: commentId, ticketId: id, deletedAt: null },
    });
    if (!comment) throw new NotFoundException();
    if (comment.authorId !== c.accountId)
      throw new DomainException(
        'forbidden',
        'لا يمكن تعديل تعليق مستخدم آخر',
        403,
      );
    await this.repo.db.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id },
        data: {
          version: { increment: 1 },
          activitySequence: { increment: 1 },
          updatedBy: c.accountId,
        },
      });
      await tx.ticketComment.update({
        where: { id: commentId },
        data: remove
          ? { deletedAt: new Date() }
          : { message: message.trim(), updatedAt: new Date() },
      });
      await tx.ticketActivity.create({
        data: {
          ticketId: id,
          sequence: updated.activitySequence,
          type: remove ? 'comment-deleted' : 'comment-edited',
          actorId: c.accountId,
          actorName: c.displayName,
          message: remove ? 'comment-deleted' : 'comment-edited',
          payload: {},
        },
      });
    });
    return this.get(c, id);
  }
  async activity(
    c: CallerContext,
    id: string,
    pageSize: number,
    cursor?: string,
  ) {
    await this.get(c, id);
    const sequence = cursor
      ? Number(Buffer.from(cursor, 'base64url').toString())
      : undefined;
    const rows = await this.repo.db.ticketActivity.findMany({
      where: {
        ticketId: id,
        ...(sequence ? { sequence: { lt: sequence } } : {}),
      },
      orderBy: { sequence: 'desc' },
      take: pageSize + 1,
    });
    const more = rows.length > pageSize;
    return {
      items: rows.slice(0, pageSize),
      total: await this.repo.db.ticketActivity.count({
        where: { ticketId: id },
      }),
      pageSize,
      nextCursor: more
        ? Buffer.from(String(rows[pageSize - 1].sequence)).toString('base64url')
        : undefined,
    };
  }
  async upload(c: CallerContext, id: string, file: UploadedFile, key?: string) {
    this.policy.assert(c, 'tickets.attach.files');
    const ticket = await this.repo.visible(c, id);
    this.policy.assertVisible(Boolean(ticket));
    if (!ticket) throw new NotFoundException();
    this.assertActive(ticket);
    if (key) {
      const existing = await this.repo.db.ticketAttachment.findFirst({
        where: { ticketId: id, uploadKey: key },
      });
      if (existing) return this.attachment(existing);
    }
    const stored = await this.storage.store(
      file,
      'ticket-attachment',
      key ? `ticket:${id}:${key}` : undefined,
    );
    const attachment = await this.repo.db.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id },
        data: {
          version: { increment: 1 },
          activitySequence: { increment: 1 },
          updatedBy: c.accountId,
        },
      });
      const created = await tx.ticketAttachment.create({
        data: {
          ticketId: id,
          name: stored.originalName,
          mimeType: stored.mimeType,
          sizeBytes: stored.size,
          storageId: stored.id,
          storageName: stored.fileName,
          uploadedBy: c.accountId,
          uploadKey: key,
        },
      });
      await tx.ticketActivity.create({
        data: {
          ticketId: id,
          sequence: updated.activitySequence,
          type: 'attachment-added',
          actorId: c.accountId,
          actorName: c.displayName,
          message: 'attachment-added',
          payload: { attachmentId: created.id, name: created.name },
        },
      });
      return created;
    });
    return this.attachment(attachment);
  }
  async download(c: CallerContext, id: string, attachmentId: string) {
    await this.get(c, id);
    const row = await this.repo.db.ticketAttachment.findFirst({
      where: { id: attachmentId, ticketId: id },
    });
    if (!row) throw new NotFoundException();
    return { row, stream: await this.storage.retrieve(row.storageName) };
  }
}
