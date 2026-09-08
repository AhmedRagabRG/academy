import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../../prisma/generated/client';
import { ContactPolicy } from '../../../src/modules/contacts/contact.policy';
import { ContactRepository } from '../../../src/modules/contacts/contact.repository';
import { ContactService } from '../../../src/modules/contacts/contact.service';
import {
  ContactDraftDto,
  ContactListDto,
} from '../../../src/modules/contacts/dto/contact.dto';
import { LeadPolicy } from '../../../src/modules/lead-pipeline/lead.policy';
import { LeadService } from '../../../src/modules/lead-pipeline/lead.service';
import {
  LeadDraftDto,
  LeadListDto,
  MoveLeadDto,
} from '../../../src/modules/lead-pipeline/dto/lead.dto';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const contactPolicy = new ContactPolicy();
const contactRepository = new ContactRepository(prisma as never);
const contacts = new ContactService(contactRepository, contactPolicy);
const leadPolicy = new LeadPolicy();
const leads = new LeadService(prisma as never, leadPolicy);

const contactPermissions = [
  'contacts.view',
  'contacts.create',
  'contacts.update',
  'contacts.delete',
  'contacts.import',
  'contacts.export',
  'contacts.groups.manage',
  'contacts.fields.manage',
  'contacts.notes.manage',
];
const pipelinePermissions = [
  'pipeline.view',
  'pipeline.create',
  'pipeline.update',
  'pipeline.move',
  'pipeline.assign',
  'pipeline.manage',
];

let organizationId: string;
let branchA: string;
let branchB: string;
let actorId: string;
let pipelineId: string;
const ownedContactIds: string[] = [];
const ownedLeadIds: string[] = [];
const FALLBACK_BRANCH_ID = '10000000-0000-4000-8000-000000009902';
const FALLBACK_BRANCH_CODE = 'CRM-TEST-SECOND';
let ownsBranchB = false;

const caller = (
  permissionKeys = [...contactPermissions, ...pipelinePermissions],
  overrides: Partial<CallerContext> = {},
): CallerContext => ({
  accountId: actorId,
  displayName: 'CRM Actor',
  email: 'crm@test.invalid',
  sessionId: 'crm-integration',
  roles: [],
  permissionKeys,
  authorizedBranchIds: [branchA],
  organizationWide: false,
  authenticatedAt: new Date(0).toISOString(),
  ...overrides,
});

const draft = (values: Partial<ContactDraftDto> = {}) =>
  Object.assign(new ContactDraftDto(), {
    name: `جهة ${randomUUID().slice(0, 6)}`,
    phone: `+2010${Math.floor(Math.random() * 100_000_000)}`,
    secondaryPhone: '',
    email: '',
    company: '',
    role: '',
    channelHandle: '',
    ...values,
  });

const track = async (values: Partial<ContactDraftDto> = {}) => {
  const contact = await contacts.create(caller(), draft(values));
  ownedContactIds.push(contact.id);
  return contact;
};

const move = (stageId: string, reason = '') =>
  Object.assign(new MoveLeadDto(), { stageId, reason });

const stageIdFor = async (code: string) =>
  (
    await prisma.pipelineStage.findFirstOrThrow({
      where: { pipelineId, code },
      select: { id: true },
    })
  ).id;

describe('CRM persisted behavioral contract', () => {
  beforeAll(async () => {
    const organization = await prisma.organization.findFirstOrThrow();
    organizationId = organization.id;
    const branches = await prisma.branch.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      take: 2,
    });
    branchA = branches[0].id;
    if (branches.length > 1) branchB = branches[1].id;
    else {
      const created = await prisma.branch.create({
        data: {
          id: FALLBACK_BRANCH_ID,
          organizationId,
          name: 'فرع اختبار العملاء',
          normalizedName: 'crm test second',
          code: FALLBACK_BRANCH_CODE,
          address: '-',
          phone: '-',
          email: 'crm-test@test.invalid',
          workingHours: '-',
        },
      });
      branchB = created.id;
      ownsBranchB = true;
    }
    actorId = (
      await prisma.account.findFirstOrThrow({ where: { status: 'ACTIVE' } })
    ).id;
    pipelineId = (
      await prisma.pipeline.findFirstOrThrow({
        where: { organizationId, isDefault: true },
      })
    ).id;
  });

  afterAll(async () => {
    if (ownedLeadIds.length) {
      await prisma.leadActivity.deleteMany({
        where: { leadId: { in: ownedLeadIds } },
      });
      await prisma.lead.deleteMany({ where: { id: { in: ownedLeadIds } } });
    }
    if (ownedContactIds.length) {
      await prisma.leadActivity.deleteMany({
        where: { lead: { contactId: { in: ownedContactIds } } },
      });
      await prisma.lead.deleteMany({
        where: { contactId: { in: ownedContactIds } },
      });
      await prisma.contactNote.deleteMany({
        where: { contactId: { in: ownedContactIds } },
      });
      await prisma.contactGroupMember.deleteMany({
        where: { contactId: { in: ownedContactIds } },
      });
      await prisma.contactCustomValue.deleteMany({
        where: { contactId: { in: ownedContactIds } },
      });
      await prisma.contact.deleteMany({
        where: { id: { in: ownedContactIds } },
      });
    }
    if (ownsBranchB)
      await prisma.branch.deleteMany({ where: { id: FALLBACK_BRANCH_ID } });
    await prisma.$disconnect();
  });

  it('rejects a duplicate phone and revives a soft-deleted contact instead', async () => {
    const contact = await track({ name: 'مريم للاختبار' });
    await expect(
      contacts.create(caller(), draft({ phone: contact.phone })),
    ).rejects.toMatchObject({ code: 'DUPLICATE_VALUE' });
    await contacts.remove(caller(), contact.id);
    const revived = await contacts.create(
      caller(),
      draft({ name: 'مريم بعد الاستعادة', phone: contact.phone }),
    );
    expect(revived.id).toBe(contact.id);
    expect(revived.name).toBe('مريم بعد الاستعادة');
  });

  it('finds a contact by Arabic name variants and by loose phone formatting', async () => {
    const contact = await track({
      name: 'فاطمة إبراهيم',
      phone: '+20 100 111 2233',
    });
    const byVariant = await contacts.list(
      caller(),
      Object.assign(new ContactListDto(), { search: 'فاطمه ابراهيم' }),
    );
    expect(byVariant.items.some((item) => item.id === contact.id)).toBe(true);
    const byPhone = await contacts.list(
      caller(),
      Object.assign(new ContactListDto(), { search: '201001112233' }),
    );
    expect(byPhone.items.some((item) => item.id === contact.id)).toBe(true);
  });

  it('hides contacts that live outside the caller authorized branches', async () => {
    const contact = await track({ name: 'خارج النطاق', branchId: branchA });
    await prisma.contact.update({
      where: { id: contact.id },
      data: { branchId: branchB },
    });
    const visible = await contacts.list(caller(), new ContactListDto());
    expect(visible.items.some((item) => item.id === contact.id)).toBe(false);
    await expect(contacts.detail(caller(), contact.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    const wide = await contacts.detail(
      caller(undefined, { organizationWide: true }),
      contact.id,
    );
    expect(wide.id).toBe(contact.id);
  });

  it('pages contacts with a stable keyset cursor', async () => {
    for (let i = 0; i < 3; i++) await track({ name: `صفحة ${i}` });
    const first = await contacts.list(
      caller(),
      Object.assign(new ContactListDto(), { limit: 2 }),
    );
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).toBeTruthy();
    const second = await contacts.list(
      caller(),
      Object.assign(new ContactListDto(), {
        limit: 2,
        cursor: first.nextCursor!,
      }),
    );
    const overlap = second.items.filter((item) =>
      first.items.some((other) => other.id === item.id),
    );
    expect(overlap).toHaveLength(0);
  });

  it('keeps a contact with an open lead from being deleted', async () => {
    const contact = await track({ name: 'مرتبطة بفرصة' });
    const lead = await leads.create(
      caller(),
      Object.assign(new LeadDraftDto(), {
        contactId: contact.id,
        priority: 'medium',
        value: '0',
        program: '',
      }),
    );
    ownedLeadIds.push(lead.id);
    await expect(contacts.remove(caller(), contact.id)).rejects.toMatchObject({
      code: 'contact-has-open-leads',
    });
    await leads.move(
      caller(),
      lead.id,
      move(await stageIdFor('lost'), 'انتهى الاهتمام'),
    );
    await expect(
      contacts.remove(caller(), contact.id),
    ).resolves.toBeUndefined();
  });

  it('records money in minor units and returns it in major units', async () => {
    const contact = await track({ name: 'صاحبة عرض' });
    const lead = await leads.create(
      caller(),
      Object.assign(new LeadDraftDto(), {
        contactId: contact.id,
        priority: 'high',
        value: '18500.75',
        program: 'برنامج تجريبي',
      }),
    );
    ownedLeadIds.push(lead.id);
    const stored = await prisma.lead.findUniqueOrThrow({
      where: { id: lead.id },
      select: { valueMinor: true },
    });
    expect(stored.valueMinor).toBe(1_850_075n);
    expect(lead.value).toBeCloseTo(18500.75, 2);
  });

  it('closes a lead when it reaches an outcome stage and reopens on the way back', async () => {
    const contact = await track({ name: 'دورة حياة الفرصة' });
    const lead = await leads.create(
      caller(),
      Object.assign(new LeadDraftDto(), {
        contactId: contact.id,
        priority: 'medium',
        value: '0',
        program: '',
      }),
    );
    ownedLeadIds.push(lead.id);
    const won = await leads.move(
      caller(),
      lead.id,
      move(await stageIdFor('won'), 'تم التسجيل'),
    );
    expect(won.outcome).toBe('won');
    expect(won.closedAt).toBeTruthy();
    const reopened = await leads.move(
      caller(),
      lead.id,
      move(await stageIdFor('contacted')),
    );
    expect(reopened.outcome).toBe('open');
    expect(reopened.closedAt).toBeUndefined();
  });

  it('requires the assign permission before a lead gets an owner', async () => {
    const contact = await track({ name: 'بدون إسناد' });
    await expect(
      leads.create(
        caller(['pipeline.view', 'pipeline.create']),
        Object.assign(new LeadDraftDto(), {
          contactId: contact.id,
          assignedAgentId: actorId,
          priority: 'medium',
          value: '0',
          program: '',
        }),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('reuses the open lead when the same contact comes back through a channel', async () => {
    const contact = await track({ name: 'عائدة عبر القناة' });
    const first = await leads.ensureFromChannel({
      organizationId,
      branchId: branchA,
      contactId: contact.id,
      occurredAt: new Date(),
    });
    ownedLeadIds.push(first!.id);
    const second = await leads.ensureFromChannel({
      organizationId,
      branchId: branchA,
      contactId: contact.id,
      occurredAt: new Date(),
    });
    expect(second!.id).toBe(first!.id);
  });

  it('creates only one open lead for simultaneous first channel messages', async () => {
    const contact = await track({ name: 'تواصل متزامن عبر القناة' });
    const occurredAt = new Date();
    const [first, second] = await Promise.all([
      leads.ensureFromChannel({
        organizationId,
        contactId: contact.id,
        occurredAt,
      }),
      leads.ensureFromChannel({
        organizationId,
        contactId: contact.id,
        occurredAt,
      }),
    ]);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second!.id).toBe(first!.id);
    ownedLeadIds.push(first!.id);
    await expect(
      prisma.lead.count({
        where: {
          pipelineId,
          contactId: contact.id,
          deletedAt: null,
          outcome: 'OPEN',
        },
      }),
    ).resolves.toBe(1);
  });

  it('groups leads onto the board columns the pipeline defines', async () => {
    const board = await leads.board(
      caller(undefined, { organizationWide: true }),
      Object.assign(new LeadListDto(), { limit: 500 }),
    );
    expect(board.columns.map((column) => column.stageId)).toEqual([
      'unassigned',
      'new',
      'contacted',
      'qualified',
      'proposal',
      'won',
      'lost',
    ]);
    expect(
      board.columns.reduce((total, column) => total + column.count, 0),
    ).toBe(board.total);
  });
});
