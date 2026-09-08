import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../prisma/generated/client';
import type {
  ContactFieldKind,
  ContactSource,
} from '../../../prisma/generated/client';
import {
  DomainException,
  DuplicateException,
  NotFoundException,
  VersionConflictException,
} from '../../core/exceptions';
import type { CallerContext } from '../../shared/types/caller-context';
import { ContactPolicy } from './contact.policy';
import {
  ContactRepository,
  normalizeEmail,
  normalizeName,
  normalizePhone,
} from './contact.repository';
import type {
  ContactCustomFieldDto,
  ContactDraftDto,
  ContactExportDto,
  ContactGroupDto,
  ContactListDto,
  ContactSourceCode,
  ImportContactsDto,
  UpdateContactDto,
} from './dto/contact.dto';

const SOURCE_DB: Record<ContactSourceCode, ContactSource> = {
  whatsapp: 'WHATSAPP',
  instagram: 'INSTAGRAM',
  facebook: 'FACEBOOK',
  website: 'WEBSITE',
  phone: 'PHONE',
  manual: 'MANUAL',
  import: 'IMPORT',
};
const sourceWire = (value: ContactSource): ContactSourceCode =>
  value.toLowerCase() as ContactSourceCode;

const FIELD_DB: Record<string, ContactFieldKind> = {
  text: 'TEXT',
  number: 'NUMBER',
  date: 'DATE',
};

const aggregateInclude = {
  groups: true,
  customValues: true,
  notes: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.ContactInclude;
type Aggregate = Prisma.ContactGetPayload<{ include: typeof aggregateInclude }>;

export interface ChannelContactIntake {
  organizationId: string;
  /**
   * Stable per-channel identity. WhatsApp and phone supply digits; Messenger
   * and Instagram supply a prefixed handle, because their participant ids are
   * numeric but are not phone numbers and must never collide with one.
   */
  identity: string;
  name: string;
  phone: string;
  source: ContactSourceCode;
  channelHandle?: string;
  occurredAt: Date;
}

@Injectable()
export class ContactService {
  constructor(
    private readonly repo: ContactRepository,
    private readonly policy: ContactPolicy,
  ) {}

  private project(row: Aggregate) {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      secondaryPhone: row.secondaryPhone ?? undefined,
      email: row.email ?? undefined,
      company: row.company ?? undefined,
      role: row.jobTitle ?? undefined,
      source: sourceWire(row.source),
      channelHandle: row.channelHandle ?? undefined,
      ownerName: row.ownerName,
      ownerAccountId: row.ownerAccountId ?? undefined,
      groupIds: row.groups.map((group) => group.groupId),
      createdAt: row.createdAt.toISOString(),
      lastActivityAt: row.lastActivityAt.toISOString(),
      version: row.version,
      customValues: Object.fromEntries(
        row.customValues.map((value) => [value.fieldId, value.value]),
      ),
      notes: row.notes.map((note) => ({
        id: note.id,
        authorName: note.authorName,
        authorAccountId: note.authorAccountId,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt?.toISOString(),
      })),
    };
  }

  private filters(q: ContactListDto): Prisma.ContactWhereInput {
    const search = q.search.trim();
    const digits = normalizePhone(search);
    return {
      AND: [
        q.source ? { source: SOURCE_DB[q.source] } : {},
        q.groupIds.length
          ? { groups: { some: { groupId: { in: q.groupIds } } } }
          : {},
        q.ownerId ? { ownerAccountId: q.ownerId } : {},
        q.withoutOwner ? { ownerAccountId: null } : {},
        search
          ? {
              OR: [
                { normalizedName: { contains: normalizeName(search) } },
                ...(digits ? [{ normalizedPhone: { contains: digits } }] : []),
                {
                  normalizedEmail: {
                    contains: normalizeEmail(search),
                  },
                },
                { company: { contains: search, mode: 'insensitive' as const } },
                {
                  channelHandle: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {},
      ],
    };
  }

  async list(c: CallerContext, q: ContactListDto) {
    const scope = this.policy.scope(c);
    const organizationId = await this.repo.organizationId();
    const fingerprint = this.repo.fingerprint(q);
    const cursor = this.repo.decode(q.cursor, fingerprint);
    const snapshotAt = cursor?.snapshotAt ?? new Date().toISOString();
    const base: Prisma.ContactWhereInput = {
      organizationId,
      deletedAt: null,
      createdAt: { lte: new Date(snapshotAt) },
      AND: [scope, this.filters(q)],
    };
    const [rows, total] = await Promise.all([
      this.repo.db.contact.findMany({
        where: { AND: [base, this.repo.cursorWhere(q.sort, cursor)] },
        include: aggregateInclude,
        orderBy: this.repo.orderBy(q.sort),
        take: q.limit + 1,
      }),
      this.repo.db.contact.count({ where: base }),
    ]);
    const hasMore = rows.length > q.limit;
    const items = rows.slice(0, q.limit);
    const last = items.at(-1);
    return {
      items: items.map((row) => this.project(row)),
      total,
      nextCursor:
        hasMore && last
          ? this.repo.encode({
              v: 1,
              fingerprint,
              id: last.id,
              snapshotAt,
              lastActivityAt: last.lastActivityAt.toISOString(),
              normalizedName: last.normalizedName,
              createdAt: last.createdAt.toISOString(),
            })
          : null,
    };
  }

  private async visible(c: CallerContext, id: string): Promise<Aggregate> {
    const organizationId = await this.repo.organizationId();
    const row = await this.repo.db.contact.findFirst({
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
    return this.project(await this.visible(c, id));
  }

  async lookups(c: CallerContext) {
    this.policy.assert(c, 'contacts.view');
    const organizationId = await this.repo.organizationId();
    const [groups, fields] = await Promise.all([
      this.repo.db.contactGroup.findMany({
        where: { organizationId, active: true },
        orderBy: { normalizedName: 'asc' },
      }),
      this.repo.db.contactCustomField.findMany({
        where: { organizationId, active: true },
        orderBy: [{ displayOrder: 'asc' }, { normalizedLabel: 'asc' }],
      }),
    ]);
    const owners = await this.repo.db.account.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { normalizedDisplayName: 'asc' },
      select: { id: true, displayName: true },
    });
    return {
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
      })),
      customFields: fields.map((field) => ({
        id: field.id,
        label: field.label,
        type: field.kind.toLowerCase(),
      })),
      owners: owners.map((owner) => ({
        id: owner.id,
        label: owner.displayName,
      })),
      sources: Object.keys(SOURCE_DB),
    };
  }

  private async draftData(
    c: CallerContext,
    organizationId: string,
    dto: ContactDraftDto,
    fallbackSource: ContactSourceCode,
  ) {
    const owner = dto.ownerAccountId
      ? await this.repo.db.account.findFirst({
          where: { id: dto.ownerAccountId, status: 'ACTIVE' },
          select: { id: true, displayName: true },
        })
      : null;
    if (dto.ownerAccountId && !owner)
      throw new DomainException('owner-invalid', 'المسؤول غير صالح', 422);
    return {
      organizationId,
      name: dto.name,
      normalizedName: normalizeName(dto.name),
      phone: dto.phone,
      normalizedPhone: normalizePhone(dto.phone),
      secondaryPhone: dto.secondaryPhone || null,
      email: dto.email || null,
      normalizedEmail: dto.email ? normalizeEmail(dto.email) : null,
      company: dto.company || null,
      jobTitle: dto.role || null,
      source: SOURCE_DB[dto.source ?? fallbackSource],
      channelHandle: dto.channelHandle || null,
      ownerAccountId: owner?.id ?? c.accountId,
      ownerName: owner?.displayName ?? c.displayName,
    };
  }

  async create(c: CallerContext, dto: ContactDraftDto) {
    this.policy.assert(c, 'contacts.create');
    const organizationId = await this.repo.organizationId();
    const data = await this.draftData(c, organizationId, dto, 'manual');
    if (!data.normalizedPhone)
      throw new DomainException('phone-invalid', 'رقم الهاتف غير صالح', 422);
    const existing = await this.repo.db.contact.findUnique({
      where: {
        organizationId_normalizedPhone: {
          organizationId,
          normalizedPhone: data.normalizedPhone,
        },
      },
      select: { id: true, deletedAt: true },
    });
    if (existing && !existing.deletedAt) throw new DuplicateException();
    const now = new Date();
    const row = existing
      ? await this.repo.db.contact.update({
          where: { id: existing.id },
          data: {
            ...data,
            deletedAt: null,
            lastActivityAt: now,
            updatedBy: c.accountId,
            version: { increment: 1 },
          },
          include: aggregateInclude,
        })
      : await this.repo.db.contact.create({
          data: {
            ...data,
            lastActivityAt: now,
            createdBy: c.accountId,
            updatedBy: c.accountId,
          },
          include: aggregateInclude,
        });
    return this.project(row);
  }

  async update(c: CallerContext, id: string, dto: UpdateContactDto) {
    this.policy.assert(c, 'contacts.update');
    const current = await this.visible(c, id);
    if (dto.expectedVersion && dto.expectedVersion !== current.version)
      throw new VersionConflictException(current.version);
    const data = await this.draftData(
      c,
      current.organizationId,
      dto,
      sourceWire(current.source),
    );
    if (!data.normalizedPhone)
      throw new DomainException('phone-invalid', 'رقم الهاتف غير صالح', 422);
    if (data.normalizedPhone !== current.normalizedPhone) {
      const clash = await this.repo.db.contact.findUnique({
        where: {
          organizationId_normalizedPhone: {
            organizationId: current.organizationId,
            normalizedPhone: data.normalizedPhone,
          },
        },
        select: { id: true, deletedAt: true },
      });
      if (clash && clash.id !== id && !clash.deletedAt)
        throw new DuplicateException();
    }
    return this.project(
      await this.repo.db.contact.update({
        where: { id },
        data: {
          ...data,
          source: dto.source ? SOURCE_DB[dto.source] : current.source,
          ownerAccountId: dto.ownerAccountId
            ? data.ownerAccountId
            : current.ownerAccountId,
          ownerName: dto.ownerAccountId ? data.ownerName : current.ownerName,
          lastActivityAt: new Date(),
          updatedBy: c.accountId,
          version: { increment: 1 },
        },
        include: aggregateInclude,
      }),
    );
  }

  async remove(c: CallerContext, id: string): Promise<void> {
    this.policy.assert(c, 'contacts.delete');
    await this.visible(c, id);
    const openLeads = await this.repo.db.lead.count({
      where: { contactId: id, deletedAt: null, outcome: 'OPEN' },
    });
    if (openLeads)
      throw new DomainException(
        'contact-has-open-leads',
        'لا يمكن حذف جهة اتصال مرتبطة بفرص مفتوحة',
        409,
      );
    await this.repo.db.contact.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: c.accountId,
        version: { increment: 1 },
      },
    });
  }

  async import(c: CallerContext, dto: ImportContactsDto) {
    this.policy.assert(c, 'contacts.import');
    const organizationId = await this.repo.organizationId();
    const now = new Date();
    const seen = new Set<string>();
    const created: string[] = [];
    const linked: string[] = [];
    const skipped: Array<{ phone: string; reason: string }> = [];
    if (dto.groupId) {
      this.policy.assert(c, 'contacts.groups.manage');
      const group = await this.repo.db.contactGroup.findFirst({
        where: { id: dto.groupId, organizationId, active: true },
        select: { id: true },
      });
      if (!group)
        throw new DomainException('group-invalid', 'المجموعة غير موجودة', 422);
    }
    for (const row of dto.rows) {
      const normalizedPhone = normalizePhone(row.phone);
      if (!normalizedPhone || !row.name.trim()) {
        skipped.push({ phone: row.phone, reason: 'invalid' });
        continue;
      }
      if (seen.has(normalizedPhone)) {
        skipped.push({ phone: row.phone, reason: 'duplicate-in-file' });
        continue;
      }
      seen.add(normalizedPhone);
      const data = await this.draftData(c, organizationId, row, 'import');
      const existing = await this.repo.db.contact.findUnique({
        where: {
          organizationId_normalizedPhone: { organizationId, normalizedPhone },
        },
        select: { id: true, deletedAt: true },
      });
      if (existing && !existing.deletedAt) {
        // With a target group the row still belongs in the audience, so the
        // contact is linked instead of dropped.
        if (dto.groupId) linked.push(existing.id);
        else skipped.push({ phone: row.phone, reason: 'already-exists' });
        continue;
      }
      const saved = existing
        ? await this.repo.db.contact.update({
            where: { id: existing.id },
            data: {
              ...data,
              deletedAt: null,
              lastActivityAt: now,
              updatedBy: c.accountId,
              version: { increment: 1 },
            },
            select: { id: true },
          })
        : await this.repo.db.contact.create({
            data: {
              ...data,
              lastActivityAt: now,
              createdBy: c.accountId,
              updatedBy: c.accountId,
            },
            select: { id: true },
          });
      created.push(saved.id);
    }
    const contactIds = [...created, ...linked];
    if (dto.groupId && contactIds.length)
      await this.repo.db.contactGroupMember.createMany({
        data: contactIds.map((contactId) => ({
          contactId,
          groupId: dto.groupId!,
          addedBy: c.accountId,
        })),
        skipDuplicates: true,
      });
    return {
      imported: created.length,
      linked: linked.length,
      skipped,
      contactIds,
    };
  }

  async exportCsv(c: CallerContext, q: ContactExportDto): Promise<string> {
    this.policy.assert(c, 'contacts.export');
    const organizationId = await this.repo.organizationId();
    const search = q.search.trim();
    const digits = normalizePhone(search);
    const rows = await this.repo.db.contact.findMany({
      where: {
        organizationId,
        deletedAt: null,
        AND: [
          this.policy.scope(c),
          q.source ? { source: SOURCE_DB[q.source] } : {},
          q.groupIds.length
            ? { groups: { some: { groupId: { in: q.groupIds } } } }
            : {},
          search
            ? {
                OR: [
                  { normalizedName: { contains: normalizeName(search) } },
                  ...(digits
                    ? [{ normalizedPhone: { contains: digits } }]
                    : []),
                ],
              }
            : {},
        ],
      },
      orderBy: { normalizedName: 'asc' },
    });
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const header = [
      'name',
      'phone',
      'secondaryPhone',
      'email',
      'company',
      'role',
      'source',
      'owner',
      'createdAt',
    ];
    const lines = rows.map((row) =>
      [
        row.name,
        row.phone,
        row.secondaryPhone ?? '',
        row.email ?? '',
        row.company ?? '',
        row.jobTitle ?? '',
        sourceWire(row.source),
        row.ownerName,
        row.createdAt.toISOString(),
      ]
        .map(escape)
        .join(','),
    );
    return [header.join(','), ...lines].join('\n');
  }

  async addNote(c: CallerContext, id: string, content: string) {
    this.policy.assert(c, 'contacts.notes.manage');
    await this.visible(c, id);
    await this.repo.db.contactNote.create({
      data: {
        contactId: id,
        authorAccountId: c.accountId,
        authorName: c.displayName,
        content,
      },
    });
    await this.touch(id);
    return this.project(await this.visible(c, id));
  }

  async editNote(
    c: CallerContext,
    id: string,
    noteId: string,
    content: string,
  ) {
    this.policy.assert(c, 'contacts.notes.manage');
    await this.visible(c, id);
    const note = await this.repo.db.contactNote.findFirst({
      where: { id: noteId, contactId: id },
    });
    if (!note) throw new NotFoundException();
    if (note.authorAccountId !== c.accountId)
      throw new DomainException('forbidden', 'يمكنك تعديل ملاحظاتك فقط', 403);
    await this.repo.db.contactNote.update({
      where: { id: noteId },
      data: { content, updatedAt: new Date() },
    });
    return this.project(await this.visible(c, id));
  }

  async deleteNote(c: CallerContext, id: string, noteId: string) {
    this.policy.assert(c, 'contacts.notes.manage');
    await this.visible(c, id);
    const note = await this.repo.db.contactNote.findFirst({
      where: { id: noteId, contactId: id },
    });
    if (!note) throw new NotFoundException();
    if (note.authorAccountId !== c.accountId)
      throw new DomainException('forbidden', 'يمكنك حذف ملاحظاتك فقط', 403);
    await this.repo.db.contactNote.delete({ where: { id: noteId } });
    return this.project(await this.visible(c, id));
  }

  async toggleGroup(c: CallerContext, id: string, groupId: string) {
    this.policy.assert(c, 'contacts.groups.manage');
    const contact = await this.visible(c, id);
    const group = await this.repo.db.contactGroup.findFirst({
      where: {
        id: groupId,
        organizationId: contact.organizationId,
        active: true,
      },
      select: { id: true },
    });
    if (!group)
      throw new DomainException('group-invalid', 'المجموعة غير صالحة', 422);
    const member = contact.groups.some((entry) => entry.groupId === groupId);
    if (member)
      await this.repo.db.contactGroupMember.delete({
        where: { contactId_groupId: { contactId: id, groupId } },
      });
    else
      await this.repo.db.contactGroupMember.create({
        data: { contactId: id, groupId, addedBy: c.accountId },
      });
    await this.touch(id);
    return this.project(await this.visible(c, id));
  }

  async setCustomValue(
    c: CallerContext,
    id: string,
    fieldId: string,
    value: string,
  ) {
    this.policy.assert(c, 'contacts.update');
    const contact = await this.visible(c, id);
    const field = await this.repo.db.contactCustomField.findFirst({
      where: {
        id: fieldId,
        organizationId: contact.organizationId,
        active: true,
      },
    });
    if (!field)
      throw new DomainException('field-invalid', 'الحقل غير صالح', 422);
    if (value && field.kind === 'NUMBER' && Number.isNaN(Number(value)))
      throw new DomainException(
        'field-value-invalid',
        'القيمة يجب أن تكون رقمًا',
        422,
      );
    if (value && field.kind === 'DATE' && Number.isNaN(Date.parse(value)))
      throw new DomainException(
        'field-value-invalid',
        'القيمة يجب أن تكون تاريخًا',
        422,
      );
    if (value)
      await this.repo.db.contactCustomValue.upsert({
        where: { contactId_fieldId: { contactId: id, fieldId } },
        update: { value },
        create: { contactId: id, fieldId, value },
      });
    else
      await this.repo.db.contactCustomValue
        .delete({ where: { contactId_fieldId: { contactId: id, fieldId } } })
        .catch(() => undefined);
    await this.touch(id);
    return this.project(await this.visible(c, id));
  }

  private async touch(id: string): Promise<void> {
    await this.repo.db.contact.update({
      where: { id },
      data: { lastActivityAt: new Date(), version: { increment: 1 } },
    });
  }

  // --- groups -------------------------------------------------------------

  async groups(c: CallerContext) {
    this.policy.assert(c, 'contacts.view');
    const organizationId = await this.repo.organizationId();
    const rows = await this.repo.db.contactGroup.findMany({
      where: { organizationId },
      orderBy: { normalizedName: 'asc' },
      include: { _count: { select: { members: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      active: row.active,
      memberCount: row._count.members,
      version: row.version,
    }));
  }

  async createGroup(c: CallerContext, dto: ContactGroupDto) {
    this.policy.assert(c, 'contacts.groups.manage');
    const organizationId = await this.repo.organizationId();
    const normalizedName = normalizeName(dto.name);
    const existing = await this.repo.db.contactGroup.findUnique({
      where: {
        organizationId_normalizedName: { organizationId, normalizedName },
      },
    });
    if (existing) throw new DuplicateException();
    const row = await this.repo.db.contactGroup.create({
      data: {
        organizationId,
        name: dto.name,
        normalizedName,
        description: dto.description,
      },
    });
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      active: row.active,
      memberCount: 0,
      version: row.version,
    };
  }

  async updateGroup(c: CallerContext, id: string, dto: ContactGroupDto) {
    this.policy.assert(c, 'contacts.groups.manage');
    const organizationId = await this.repo.organizationId();
    const current = await this.repo.db.contactGroup.findFirst({
      where: { id, organizationId },
    });
    if (!current) throw new NotFoundException();
    const normalizedName = normalizeName(dto.name);
    if (normalizedName !== current.normalizedName) {
      const clash = await this.repo.db.contactGroup.findUnique({
        where: {
          organizationId_normalizedName: { organizationId, normalizedName },
        },
        select: { id: true },
      });
      if (clash) throw new DuplicateException();
    }
    const row = await this.repo.db.contactGroup.update({
      where: { id },
      data: {
        name: dto.name,
        normalizedName,
        description: dto.description,
        version: { increment: 1 },
      },
      include: { _count: { select: { members: true } } },
    });
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      active: row.active,
      memberCount: row._count.members,
      version: row.version,
    };
  }

  async removeGroup(c: CallerContext, id: string): Promise<void> {
    this.policy.assert(c, 'contacts.groups.manage');
    const organizationId = await this.repo.organizationId();
    const current = await this.repo.db.contactGroup.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!current) throw new NotFoundException();
    await this.repo.db.contactGroup.delete({ where: { id } });
  }

  // --- custom fields ------------------------------------------------------

  async customFields(c: CallerContext) {
    this.policy.assert(c, 'contacts.view');
    const organizationId = await this.repo.organizationId();
    const rows = await this.repo.db.contactCustomField.findMany({
      where: { organizationId },
      orderBy: [{ displayOrder: 'asc' }, { normalizedLabel: 'asc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      type: row.kind.toLowerCase(),
      active: row.active,
      version: row.version,
    }));
  }

  async createCustomField(c: CallerContext, dto: ContactCustomFieldDto) {
    this.policy.assert(c, 'contacts.fields.manage');
    const organizationId = await this.repo.organizationId();
    const normalizedLabel = normalizeName(dto.label);
    const existing = await this.repo.db.contactCustomField.findUnique({
      where: {
        organizationId_normalizedLabel: { organizationId, normalizedLabel },
      },
      select: { id: true },
    });
    if (existing) throw new DuplicateException();
    const count = await this.repo.db.contactCustomField.count({
      where: { organizationId },
    });
    const row = await this.repo.db.contactCustomField.create({
      data: {
        organizationId,
        label: dto.label,
        normalizedLabel,
        kind: FIELD_DB[dto.type],
        displayOrder: count,
      },
    });
    return {
      id: row.id,
      label: row.label,
      type: row.kind.toLowerCase(),
      active: row.active,
      version: row.version,
    };
  }

  async removeCustomField(c: CallerContext, id: string): Promise<void> {
    this.policy.assert(c, 'contacts.fields.manage');
    const organizationId = await this.repo.organizationId();
    const current = await this.repo.db.contactCustomField.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!current) throw new NotFoundException();
    await this.repo.db.contactCustomField.delete({ where: { id } });
  }

  // --- channel intake -----------------------------------------------------

  /**
   * Upserts the CRM contact behind an inbound channel conversation, keyed on
   * the same identity the inbox customer uses so the two stay one-to-one.
   */
  async ensureFromChannel(intake: ChannelContactIntake) {
    const normalizedPhone = intake.identity;
    const existing = await this.repo.db.contact.findUnique({
      where: {
        organizationId_normalizedPhone: {
          organizationId: intake.organizationId,
          normalizedPhone,
        },
      },
    });
    if (existing)
      return this.repo.db.contact.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          lastActivityAt:
            intake.occurredAt > existing.lastActivityAt
              ? intake.occurredAt
              : existing.lastActivityAt,
          ...(existing.channelHandle
            ? {}
            : { channelHandle: intake.channelHandle ?? null }),
        },
      });
    try {
      return await this.repo.db.contact.create({
        data: {
          organizationId: intake.organizationId,
          name: intake.name,
          normalizedName: normalizeName(intake.name),
          phone: intake.phone,
          normalizedPhone,
          source: SOURCE_DB[intake.source],
          channelHandle: intake.channelHandle ?? null,
          ownerName: 'النظام',
          lastActivityAt: intake.occurredAt,
        },
      });
    } catch (error) {
      // Two inbound messages for a brand-new identity can be processed
      // concurrently; the loser of the unique-constraint race reuses the
      // contact the winner just created instead of failing the webhook.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        Array.isArray(
          (error.meta as { target?: unknown } | undefined)?.target,
        ) &&
        (error.meta as { target: unknown[] }).target.includes('normalizedPhone')
      )
        return this.repo.db.contact.findUniqueOrThrow({
          where: {
            organizationId_normalizedPhone: {
              organizationId: intake.organizationId,
              normalizedPhone,
            },
          },
        });
      throw error;
    }
  }
}
