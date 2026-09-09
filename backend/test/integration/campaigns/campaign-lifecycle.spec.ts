import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../../prisma/generated/client';
import {
  normalizeName,
  normalizePhone,
} from '../../../src/modules/contacts/contact.repository';
import type { ContactService } from '../../../src/modules/contacts/contact.service';
import { ChannelCredentialsService } from '../../../src/modules/inbox/channels/channel-credentials.service';
import type { MetaGraphClient } from '../../../src/modules/inbox/channels/meta-graph.client';
import { CampaignPolicy } from '../../../src/modules/campaigns/campaign.policy';
import { CampaignRepository } from '../../../src/modules/campaigns/campaign.repository';
import { CampaignService } from '../../../src/modules/campaigns/campaign.service';
import { WhatsappTemplateSender } from '../../../src/modules/campaigns/dispatch/whatsapp-template.sender';
import { WhatsappTemplateService } from '../../../src/modules/campaigns/templates/whatsapp-template.service';
import {
  CampaignDraftDto,
  UpdateCampaignDto,
} from '../../../src/modules/campaigns/dto/campaign.dto';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const permissions = [
  'campaigns.view',
  'campaigns.create',
  'campaigns.update',
  'campaigns.delete',
  'campaigns.launch',
  'campaigns.templates.sync',
];

let organizationId: string;
let actorId: string;
const ownedCampaignIds: string[] = [];
const ownedTemplateIds: string[] = [];
const ownedGroupIds: string[] = [];
const ownedContactIds: string[] = [];
const ownedFieldIds: string[] = [];

const caller = (
  overridePermissions: string[] = permissions,
): CallerContext => ({
  accountId: actorId,
  displayName: 'مسؤول الحملات',
  email: 'campaigns@test.invalid',
  sessionId: 'campaigns-integration',
  roles: [],
  permissionKeys: overridePermissions,
  organizationWide: true,
  authenticatedAt: new Date(0).toISOString(),
});

const contactsStub = { import: jest.fn() } as unknown as ContactService;

const configured = new ConfigService({
  meta: {
    whatsappPhoneNumberId: 'test-phone-id',
    whatsappAccessToken: 'test-access-token',
    whatsappBusinessAccountId: 'test-waba-id',
    messengerPageId: '',
    messengerPageAccessToken: '',
    instagramAccountId: '',
    instagramAccessToken: '',
  },
});
const unconfigured = new ConfigService({
  meta: {
    whatsappPhoneNumberId: '',
    whatsappAccessToken: '',
    whatsappBusinessAccountId: '',
    messengerPageId: '',
    messengerPageAccessToken: '',
    instagramAccountId: '',
    instagramAccessToken: '',
  },
});

const repo = new CampaignRepository(prisma as never);
const policy = new CampaignPolicy();
const credentialsConfigured = new ChannelCredentialsService(
  prisma as never,
  configured,
);
const credentialsMissing = new ChannelCredentialsService(
  prisma as never,
  unconfigured,
);
const templates = new WhatsappTemplateService(
  prisma as never,
  {} as unknown as MetaGraphClient,
  credentialsConfigured,
  policy,
);
const senderConfigured = new WhatsappTemplateSender(
  configured,
  credentialsConfigured,
);
const senderMissing = new WhatsappTemplateSender(
  unconfigured,
  credentialsMissing,
);
const campaigns = new CampaignService(
  repo,
  policy,
  templates,
  contactsStub,
  senderConfigured,
  credentialsConfigured,
);
const campaignsNoChannel = new CampaignService(
  repo,
  policy,
  templates,
  contactsStub,
  senderMissing,
  credentialsMissing,
);

let templateArApproved: { id: string };
let templateEnApproved: { id: string };
let templatePending: { id: string };
let groupA: { id: string };
let groupB: { id: string };
let groupInactive: { id: string };
let contactShared: { id: string; name: string };
let contactAOnly: { id: string; name: string };
let contactBOnly: { id: string; name: string };
let contactNoPhone: { id: string };
let interestField: { id: string };

const draft = (overrides: Partial<CampaignDraftDto> = {}) =>
  Object.assign(new CampaignDraftDto(), {
    name: `حملة اختبار ${randomUUID().slice(0, 8)}`,
    description: '',
    templateId: '',
    groupIds: [],
    variables: [],
    headerVariables: [],
    throttlePerMinute: 120,
    ...overrides,
  });

describe('Campaign creation and WhatsApp template lifecycle (real Postgres)', () => {
  beforeAll(async () => {
    organizationId = (await prisma.organization.findFirstOrThrow()).id;
    actorId = (
      await prisma.account.findFirstOrThrow({ where: { status: 'ACTIVE' } })
    ).id;
    const syncedAt = new Date();

    templateArApproved = await prisma.whatsappTemplate.create({
      data: {
        organizationId,
        wabaId: 'waba-test',
        providerTemplateId: `tpl-ar-${randomUUID()}`,
        name: 'open_day_invite',
        language: 'ar',
        category: 'MARKETING',
        status: 'APPROVED',
        headerKind: 'TEXT',
        headerText: 'دعوة {{1}}',
        bodyText: 'مرحبًا {{1}}، الموعد {{2}}',
        footerText: 'أكاديمية السلام',
        buttons: [],
        variableCount: 2,
        headerVariableCount: 1,
        syncedAt,
      },
    });
    templateEnApproved = await prisma.whatsappTemplate.create({
      data: {
        organizationId,
        wabaId: 'waba-test',
        providerTemplateId: `tpl-en-${randomUUID()}`,
        name: 'open_day_invite',
        language: 'en_US',
        category: 'MARKETING',
        status: 'APPROVED',
        bodyText: 'Hello {{1}}',
        buttons: [],
        variableCount: 1,
        headerVariableCount: 0,
        syncedAt,
      },
    });
    templatePending = await prisma.whatsappTemplate.create({
      data: {
        organizationId,
        wabaId: 'waba-test',
        providerTemplateId: `tpl-pending-${randomUUID()}`,
        name: 'summer_courses',
        language: 'ar',
        category: 'MARKETING',
        status: 'PENDING',
        bodyText: 'خصم {{1}}٪ على برامج الصيف',
        buttons: [],
        variableCount: 1,
        headerVariableCount: 0,
        syncedAt,
      },
    });
    ownedTemplateIds.push(
      templateArApproved.id,
      templateEnApproved.id,
      templatePending.id,
    );

    const group = (name: string, active = true) =>
      prisma.contactGroup.create({
        data: {
          organizationId,
          name,
          normalizedName: normalizeName(name),
          active,
        },
      });
    groupA = await group(`مجموعة أ ${randomUUID().slice(0, 6)}`);
    groupB = await group(`مجموعة ب ${randomUUID().slice(0, 6)}`);
    groupInactive = await group(
      `مجموعة معطلة ${randomUUID().slice(0, 6)}`,
      false,
    );
    ownedGroupIds.push(groupA.id, groupB.id, groupInactive.id);

    const contact = (name: string, phone: string) =>
      prisma.contact.create({
        data: {
          organizationId,
          name,
          normalizedName: normalizeName(name),
          phone,
          normalizedPhone: normalizePhone(phone),
          source: 'MANUAL',
          ownerAccountId: actorId,
          ownerName: 'مسؤول الحملات',
          lastActivityAt: new Date(),
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    contactShared = await contact(
      'هدى مشتركة',
      `+2010${Math.floor(Math.random() * 100_000_000)}`,
    );
    contactAOnly = await contact(
      'كريم في المجموعة أ',
      `+2010${Math.floor(Math.random() * 100_000_000)}`,
    );
    contactBOnly = await contact(
      'منى في المجموعة ب',
      `+2010${Math.floor(Math.random() * 100_000_000)}`,
    );
    // Simulates a legacy record whose stored `normalizedPhone` cannot reflect
    // a raw phone with no digits — the campaign audience must still recompute
    // and exclude it rather than trusting the stored column.
    contactNoPhone = await prisma.contact.create({
      data: {
        organizationId,
        name: 'بلا رقم صالح',
        normalizedName: normalizeName('بلا رقم صالح'),
        phone: 'لا يوجد رقم',
        normalizedPhone: `invalid-${randomUUID()}`,
        source: 'MANUAL',
        ownerAccountId: actorId,
        ownerName: 'مسؤول الحملات',
        lastActivityAt: new Date(),
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    ownedContactIds.push(
      contactShared.id,
      contactAOnly.id,
      contactBOnly.id,
      contactNoPhone.id,
    );

    await prisma.contactGroupMember.createMany({
      data: [
        { contactId: contactShared.id, groupId: groupA.id, addedBy: actorId },
        { contactId: contactAOnly.id, groupId: groupA.id, addedBy: actorId },
        { contactId: contactNoPhone.id, groupId: groupA.id, addedBy: actorId },
        { contactId: contactShared.id, groupId: groupB.id, addedBy: actorId },
        { contactId: contactBOnly.id, groupId: groupB.id, addedBy: actorId },
      ],
    });

    interestField = await prisma.contactCustomField.create({
      data: {
        organizationId,
        label: 'البرنامج المهتم به',
        normalizedLabel: normalizeName('البرنامج المهتم به'),
        kind: 'TEXT',
      },
    });
    ownedFieldIds.push(interestField.id);
    await prisma.contactCustomValue.createMany({
      data: [
        {
          contactId: contactShared.id,
          fieldId: interestField.id,
          value: 'اللغة الإنجليزية',
        },
        {
          contactId: contactAOnly.id,
          fieldId: interestField.id,
          value: 'البرمجة',
        },
      ],
    });
  });

  afterAll(async () => {
    if (ownedCampaignIds.length)
      await prisma.campaign.deleteMany({
        where: { id: { in: ownedCampaignIds } },
      });
    if (ownedFieldIds.length)
      await prisma.contactCustomValue.deleteMany({
        where: { fieldId: { in: ownedFieldIds } },
      });
    if (ownedContactIds.length) {
      await prisma.contactGroupMember.deleteMany({
        where: { contactId: { in: ownedContactIds } },
      });
      await prisma.contact.deleteMany({
        where: { id: { in: ownedContactIds } },
      });
    }
    if (ownedFieldIds.length)
      await prisma.contactCustomField.deleteMany({
        where: { id: { in: ownedFieldIds } },
      });
    if (ownedGroupIds.length)
      await prisma.contactGroup.deleteMany({
        where: { id: { in: ownedGroupIds } },
      });
    if (ownedTemplateIds.length)
      await prisma.whatsappTemplate.deleteMany({
        where: { id: { in: ownedTemplateIds } },
      });
    await prisma.$disconnect();
  });

  it('rejects a campaign name that only differs by Arabic diacritics or hamza form', async () => {
    const created = await campaigns.create(
      caller(),
      draft({
        name: 'حملة الافتتاح',
        templateId: templateArApproved.id,
        variables: [
          { position: 1, source: 'literal', value: 'هدى', fallback: '' },
          { position: 2, source: 'literal', value: 'الاثنين', fallback: '' },
        ],
        headerVariables: [
          { position: 1, source: 'literal', value: 'دعوة', fallback: '' },
        ],
      }),
    );
    ownedCampaignIds.push(created.id);

    await expect(
      campaigns.create(
        caller(),
        draft({
          name: 'حملة الإفتتاح',
          templateId: templateArApproved.id,
          variables: [
            { position: 1, source: 'literal', value: 'أ', fallback: '' },
            { position: 2, source: 'literal', value: 'ب', fallback: '' },
          ],
          headerVariables: [
            { position: 1, source: 'literal', value: 'ج', fallback: '' },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: 'DUPLICATE_VALUE' });
  });

  it('rejects an unknown template and an inactive or unknown audience group', async () => {
    await expect(
      campaigns.create(caller(), draft({ templateId: randomUUID() })),
    ).rejects.toMatchObject({ code: 'template-invalid' });

    const validBindings = {
      variables: [
        { position: 1, source: 'literal' as const, value: 'أ', fallback: '' },
        { position: 2, source: 'literal' as const, value: 'ب', fallback: '' },
      ],
      headerVariables: [
        { position: 1, source: 'literal' as const, value: 'ج', fallback: '' },
      ],
    };
    await expect(
      campaigns.create(
        caller(),
        draft({
          templateId: templateArApproved.id,
          groupIds: [randomUUID()],
          ...validBindings,
        }),
      ),
    ).rejects.toMatchObject({ code: 'audience-invalid' });

    await expect(
      campaigns.create(
        caller(),
        draft({
          templateId: templateArApproved.id,
          groupIds: [groupInactive.id],
          ...validBindings,
        }),
      ),
    ).rejects.toMatchObject({ code: 'audience-invalid' });
  });

  it('keeps two language variants of the same template name independently selectable', async () => {
    const arabic = await campaigns.create(
      caller(),
      draft({
        templateId: templateArApproved.id,
        variables: [
          { position: 1, source: 'literal', value: 'أ', fallback: '' },
          { position: 2, source: 'literal', value: 'ب', fallback: '' },
        ],
        headerVariables: [
          { position: 1, source: 'literal', value: 'ج', fallback: '' },
        ],
      }),
    );
    const english = await campaigns.create(
      caller(),
      draft({
        templateId: templateEnApproved.id,
        variables: [
          { position: 1, source: 'literal', value: 'Hoda', fallback: '' },
        ],
      }),
    );
    ownedCampaignIds.push(arabic.id, english.id);

    expect(arabic.template.id).not.toBe(english.template.id);
    expect(arabic.template.name).toBe(english.template.name);
    expect(arabic.template.language).toBe('ar');
    expect(english.template.language).toBe('en_US');
  });

  it('rejects an update carrying a stale version', async () => {
    const created = await campaigns.create(
      caller(),
      draft({
        templateId: templateArApproved.id,
        variables: [
          { position: 1, source: 'literal', value: 'أ', fallback: '' },
          { position: 2, source: 'literal', value: 'ب', fallback: '' },
        ],
        headerVariables: [
          { position: 1, source: 'literal', value: 'ج', fallback: '' },
        ],
      }),
    );
    ownedCampaignIds.push(created.id);
    expect(created.version).toBe(1);

    const update = Object.assign(new UpdateCampaignDto(), {
      ...draft({ templateId: templateArApproved.id }),
      name: created.name,
      variables: [
        { position: 1, source: 'literal', value: 'د', fallback: '' },
        { position: 2, source: 'literal', value: 'هـ', fallback: '' },
      ],
      headerVariables: [
        { position: 1, source: 'literal', value: 'و', fallback: '' },
      ],
      expectedVersion: 99,
    });
    await expect(
      campaigns.update(caller(), created.id, update),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT', currentVersion: 1 });
  });

  it('rejects creating (not just launching) a campaign against a template Meta has not approved', async () => {
    await expect(
      campaigns.create(
        caller(),
        draft({
          templateId: templatePending.id,
          groupIds: [groupA.id],
          variables: [
            { position: 1, source: 'literal', value: '20', fallback: '' },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: 'template-not-approved', status: 422 });
  });

  it('rejects launching a campaign with no audience selected', async () => {
    const created = await campaigns.create(
      caller(),
      draft({
        templateId: templateArApproved.id,
        groupIds: [],
        variables: [
          { position: 1, source: 'literal', value: 'أ', fallback: '' },
          { position: 2, source: 'literal', value: 'ب', fallback: '' },
        ],
        headerVariables: [
          { position: 1, source: 'literal', value: 'ج', fallback: '' },
        ],
      }),
    );
    ownedCampaignIds.push(created.id);
    await expect(
      campaigns.launch(caller(), created.id, {}),
    ).rejects.toMatchObject({ code: 'audience-empty' });
  });

  it('rejects launching when the server has no WhatsApp channel credentials', async () => {
    const created = await campaigns.create(
      caller(),
      draft({
        templateId: templateArApproved.id,
        groupIds: [groupA.id],
        variables: [
          { position: 1, source: 'literal', value: 'أ', fallback: '' },
          { position: 2, source: 'literal', value: 'ب', fallback: '' },
        ],
        headerVariables: [
          { position: 1, source: 'literal', value: 'ج', fallback: '' },
        ],
      }),
    );
    ownedCampaignIds.push(created.id);
    await expect(
      campaignsNoChannel.launch(caller(), created.id, {}),
    ).rejects.toMatchObject({ code: 'channel-not-configured', status: 503 });
  });

  it('rejects a test send when Meta has disabled the selected template', async () => {
    const created = await campaigns.create(
      caller(),
      draft({
        templateId: templateArApproved.id,
        variables: [
          { position: 1, source: 'literal', value: 'أ', fallback: '' },
          { position: 2, source: 'literal', value: 'ب', fallback: '' },
        ],
        headerVariables: [
          { position: 1, source: 'literal', value: 'ج', fallback: '' },
        ],
      }),
    );
    ownedCampaignIds.push(created.id);
    await prisma.whatsappTemplate.update({
      where: { id: templateArApproved.id },
      data: { status: 'DISABLED' },
    });
    try {
      await expect(
        campaigns.testSend(caller(), created.id, { phone: '+201000000000' }),
      ).rejects.toMatchObject({ code: 'template-not-approved', status: 422 });
    } finally {
      await prisma.whatsappTemplate.update({
        where: { id: templateArApproved.id },
        data: { status: 'APPROVED' },
      });
    }
  });

  it('revalidates bindings before a test send after Meta changes the template', async () => {
    const created = await campaigns.create(
      caller(),
      draft({
        templateId: templateArApproved.id,
        variables: [
          { position: 1, source: 'literal', value: 'أ', fallback: '' },
          { position: 2, source: 'literal', value: 'ب', fallback: '' },
        ],
        headerVariables: [
          { position: 1, source: 'literal', value: 'ج', fallback: '' },
        ],
      }),
    );
    ownedCampaignIds.push(created.id);
    await prisma.whatsappTemplate.update({
      where: { id: templateArApproved.id },
      data: {
        bodyText: 'مرحبًا {{1}}، الموعد {{2}}، المكان {{3}}',
        variableCount: 3,
      },
    });
    try {
      await expect(
        campaigns.testSend(caller(), created.id, { phone: '+201000000000' }),
      ).rejects.toMatchObject({ code: 'variables-mismatch', status: 422 });
    } finally {
      await prisma.whatsappTemplate.update({
        where: { id: templateArApproved.id },
        data: {
          bodyText: 'مرحبًا {{1}}، الموعد {{2}}',
          variableCount: 2,
        },
      });
    }
  });

  it('rejects creating or updating a campaign with an unbound body or header placeholder', async () => {
    // The template needs two body placeholders; only one is bound.
    await expect(
      campaigns.create(
        caller(),
        draft({
          templateId: templateArApproved.id,
          groupIds: [groupA.id],
          variables: [
            { position: 1, source: 'literal', value: 'أ', fallback: '' },
          ],
          headerVariables: [
            { position: 1, source: 'literal', value: 'ج', fallback: '' },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: 'variables-mismatch', status: 422 });

    // A draft that starts out valid must stay valid through an update too.
    const created = await campaigns.create(
      caller(),
      draft({
        templateId: templateArApproved.id,
        groupIds: [groupA.id],
        variables: [
          { position: 1, source: 'literal', value: 'أ', fallback: '' },
          { position: 2, source: 'literal', value: 'ب', fallback: '' },
        ],
        headerVariables: [
          { position: 1, source: 'literal', value: 'ج', fallback: '' },
        ],
      }),
    );
    ownedCampaignIds.push(created.id);
    const update = Object.assign(new UpdateCampaignDto(), {
      ...draft({ templateId: templateArApproved.id, groupIds: [groupA.id] }),
      name: created.name,
      variables: [{ position: 1, source: 'literal', value: 'أ', fallback: '' }],
      headerVariables: [
        { position: 1, source: 'literal', value: 'ج', fallback: '' },
      ],
      expectedVersion: created.version,
    });
    await expect(
      campaigns.update(caller(), created.id, update),
    ).rejects.toMatchObject({ code: 'variables-mismatch', status: 422 });
  });

  it('previews the deduplicated, invalid-excluding audience across overlapping groups', async () => {
    const preview = await campaigns.previewAudience(caller(), {
      groupIds: [groupA.id, groupB.id],
      contactIds: [],
    });
    expect(preview.total).toBe(3);
    expect(preview.invalid).toBe(1);
    expect(preview.duplicates).toBe(0);
    const names = preview.sample.map((row) => row.name);
    expect(names).toContain(contactShared.name);
    expect(names).not.toContain('بلا رقم صالح');
  });

  it('launches, freezing a deduplicated audience and skipping recipients missing a bound value', async () => {
    const created = await campaigns.create(
      caller(),
      draft({
        templateId: templateArApproved.id,
        groupIds: [groupA.id, groupB.id],
        variables: [
          {
            position: 1,
            source: 'field',
            value: interestField.id,
            fallback: '',
          },
          { position: 2, source: 'literal', value: 'الاثنين', fallback: '' },
        ],
        headerVariables: [
          { position: 1, source: 'contact', value: 'name', fallback: '' },
        ],
      }),
    );
    ownedCampaignIds.push(created.id);

    const launched = await campaigns.launch(caller(), created.id, {});
    expect(launched.status).toBe('running');
    expect(launched.stats.total).toBe(3);
    expect(launched.stats.pending).toBe(2);
    expect(launched.stats.skipped).toBe(1);
    expect(launched.events.some((event) => event.kind === 'started')).toBe(
      true,
    );

    const recipients = await prisma.campaignRecipient.findMany({
      where: { campaignId: created.id },
    });
    expect(recipients).toHaveLength(3);
    // The contact with no custom field value cannot resolve every placeholder.
    const skipped = recipients.find((row) => row.contactId === contactBOnly.id);
    expect(skipped?.status).toBe('SKIPPED');
    expect(skipped?.errorCode).toBe('missing-variable');

    const shared = recipients.find((row) => row.contactId === contactShared.id);
    expect(shared?.status).toBe('PENDING');
    expect(shared?.variables).toEqual(['اللغة الإنجليزية', 'الاثنين']);
    expect(shared?.headerVariables).toEqual([contactShared.name]);

    // The contact with no digits in its phone is excluded outright, not just skipped.
    expect(recipients.some((row) => row.contactId === contactNoPhone.id)).toBe(
      false,
    );

    const refreshed = await prisma.campaign.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(refreshed.totalRecipients).toBe(3);
    expect(refreshed.skippedCount).toBe(1);

    // --- lifecycle: pause, resume, then cancel drains the remaining queue ---
    const paused = await campaigns.pause(caller(), created.id);
    expect(paused.status).toBe('paused');
    const resumed = await campaigns.resume(caller(), created.id);
    expect(resumed.status).toBe('running');
    const cancelled = await campaigns.cancel(caller(), created.id);
    expect(cancelled.status).toBe('cancelled');

    const afterCancel = await prisma.campaignRecipient.findMany({
      where: { campaignId: created.id },
    });
    expect(afterCancel.every((row) => row.status !== 'PENDING')).toBe(true);
    const cancelledPending = afterCancel.filter(
      (row) => row.errorCode === 'cancelled',
    );
    expect(cancelledPending).toHaveLength(2);
  });

  it('schedules a future launch instead of starting immediately', async () => {
    const created = await campaigns.create(
      caller(),
      draft({
        templateId: templateArApproved.id,
        groupIds: [groupA.id],
        variables: [
          { position: 1, source: 'literal', value: 'أ', fallback: '' },
          { position: 2, source: 'literal', value: 'ب', fallback: '' },
        ],
        headerVariables: [
          { position: 1, source: 'literal', value: 'ج', fallback: '' },
        ],
      }),
    );
    ownedCampaignIds.push(created.id);
    const scheduledAt = new Date(Date.now() + 3_600_000).toISOString();
    const launched = await campaigns.launch(caller(), created.id, {
      scheduledAt,
    });
    expect(launched.status).toBe('scheduled');
    expect(
      launched.events.some((event) => event.kind === 'audience_built'),
    ).toBe(true);
  });

  it('allows a campaign name to be reused once the original campaign is soft-deleted', async () => {
    const name = `حملة قابلة لإعادة الاستخدام ${randomUUID().slice(0, 6)}`;
    const bindings = {
      variables: [
        { position: 1, source: 'literal' as const, value: 'أ', fallback: '' },
        { position: 2, source: 'literal' as const, value: 'ب', fallback: '' },
      ],
      headerVariables: [
        { position: 1, source: 'literal' as const, value: 'ج', fallback: '' },
      ],
    };
    const original = await campaigns.create(
      caller(),
      draft({ name, templateId: templateArApproved.id, ...bindings }),
    );
    await campaigns.remove(caller(), original.id);

    // The unique name index only constrains active rows: the app-level
    // pre-check and the database must agree that a soft-deleted campaign no
    // longer occupies its name.
    const reused = await campaigns.create(
      caller(),
      draft({ name, templateId: templateArApproved.id, ...bindings }),
    );
    ownedCampaignIds.push(original.id, reused.id);
    expect(reused.id).not.toBe(original.id);
    expect(reused.name).toBe(name);
  });

  it('serializes concurrent updates through the campaign version, rejecting the loser', async () => {
    const created = await campaigns.create(
      caller(),
      draft({
        templateId: templateArApproved.id,
        groupIds: [groupA.id],
        variables: [
          { position: 1, source: 'literal', value: 'أ', fallback: '' },
          { position: 2, source: 'literal', value: 'ب', fallback: '' },
        ],
        headerVariables: [
          { position: 1, source: 'literal', value: 'ج', fallback: '' },
        ],
      }),
    );
    ownedCampaignIds.push(created.id);

    const updateWith = (throttlePerMinute: number) =>
      Object.assign(new UpdateCampaignDto(), {
        ...draft({
          templateId: templateArApproved.id,
          groupIds: [groupA.id],
        }),
        name: created.name,
        variables: [
          { position: 1, source: 'literal', value: 'أ', fallback: '' },
          { position: 2, source: 'literal', value: 'ب', fallback: '' },
        ],
        headerVariables: [
          { position: 1, source: 'literal', value: 'ج', fallback: '' },
        ],
        throttlePerMinute,
        expectedVersion: created.version,
      });

    const attempts = await Promise.allSettled([
      campaigns.update(caller(), created.id, updateWith(150)),
      campaigns.update(caller(), created.id, updateWith(200)),
    ]);

    expect(
      attempts.filter((attempt) => attempt.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = attempts.find(
      (attempt): attempt is PromiseRejectedResult =>
        attempt.status === 'rejected',
    );
    expect(rejected?.reason).toMatchObject({ code: 'VERSION_CONFLICT' });

    const persisted = await campaigns.detail(caller(), created.id);
    expect(persisted.version).toBe(created.version + 1);
    expect([150, 200]).toContain(persisted.throttlePerMinute);
  });
});
