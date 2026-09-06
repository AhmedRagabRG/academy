import type { PrismaClient } from '../generated/client';
import { normalizeArabic } from '../../src/shared/utils/arabic-normalize';

const uuid = (group: string, value: number) =>
  `${group}0000-0000-4000-8000-${String(value).padStart(12, '0')}`;

const normalizeName = (value: string) =>
  normalizeArabic(value).trim().toLocaleLowerCase();

const STAGES = [
  [
    'unassigned',
    'غير مسند',
    'تواصل جديد بانتظار التوزيع',
    5,
    'slate',
    'OPEN',
    true,
  ],
  [
    'new',
    'فرصة جديدة',
    'تم إنشاء الفرصة ولم يبدأ التواصل',
    10,
    'blue',
    'OPEN',
    false,
  ],
  [
    'contacted',
    'تم التواصل',
    'بدأت المحادثة مع جهة الاتصال',
    30,
    'sky',
    'OPEN',
    false,
  ],
  [
    'qualified',
    'مؤهلة',
    'الاحتياج والميزانية والموعد مناسبون',
    55,
    'amber',
    'OPEN',
    false,
  ],
  [
    'proposal',
    'عرض مرسل',
    'أُرسل العرض أو تفاصيل التسجيل',
    75,
    'violet',
    'OPEN',
    false,
  ],
  ['won', 'مكتسبة', 'اكتمل التسجيل أو الاتفاق', 100, 'green', 'WON', false],
  ['lost', 'غير مكتسبة', 'لم تكتمل الفرصة', 0, 'red', 'LOST', false],
] as const;

const GROUPS = [
  ['فرص مهتمة', 'جهات تحتاج متابعة خلال هذا الأسبوع'],
  ['أولياء الأمور', 'أولياء أمور الطلاب والمتقدمين'],
  ['شركاء الشركات', 'مسؤولو التدريب والتطوير في الشركات'],
] as const;

const FIELDS = [
  ['البرنامج المهتم به', 'TEXT'],
  ['الميزانية المتوقعة', 'NUMBER'],
] as const;

const PLATFORMS = [['instagram', 'إنستغرام', 'Instagram']] as const;

export async function seedCrm(prisma: PrismaClient): Promise<void> {
  const organization = await prisma.organization.findFirstOrThrow({
    select: { id: true },
  });
  const settings = await prisma.generalSettings.findFirst({
    where: { organizationId: organization.id },
    select: { currency: true },
  });
  const currency = settings?.currency ?? 'EGP';

  for (const [code, label, icon] of PLATFORMS)
    await prisma.inboxPlatform.upsert({
      where: { organizationId_code: { organizationId: organization.id, code } },
      update: {},
      create: { organizationId: organization.id, code, label, icon },
    });

  const pipeline = await prisma.pipeline.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: 'admissions',
      },
    },
    update: {},
    create: {
      id: uuid('7000', 1),
      organizationId: organization.id,
      code: 'admissions',
      name: 'مسار القبول والمبيعات',
      isDefault: true,
    },
  });
  for (let i = 0; i < STAGES.length; i++) {
    const [code, name, description, probability, accent, outcome, isEntry] =
      STAGES[i];
    await prisma.pipelineStage.upsert({
      where: { pipelineId_code: { pipelineId: pipeline.id, code } },
      update: { name, description, probability, accent, position: i },
      create: {
        id: uuid('7100', i + 1),
        pipelineId: pipeline.id,
        code,
        name,
        description,
        probability,
        accent,
        outcome,
        position: i,
        isEntry,
      },
    });
  }

  for (let i = 0; i < GROUPS.length; i++) {
    const [name, description] = GROUPS[i];
    await prisma.contactGroup.upsert({
      where: {
        organizationId_normalizedName: {
          organizationId: organization.id,
          normalizedName: normalizeName(name),
        },
      },
      update: {},
      create: {
        id: uuid('7200', i + 1),
        organizationId: organization.id,
        name,
        normalizedName: normalizeName(name),
        description,
      },
    });
  }

  for (let i = 0; i < FIELDS.length; i++) {
    const [label, kind] = FIELDS[i];
    await prisma.contactCustomField.upsert({
      where: {
        organizationId_normalizedLabel: {
          organizationId: organization.id,
          normalizedLabel: normalizeName(label),
        },
      },
      update: {},
      create: {
        id: uuid('7300', i + 1),
        organizationId: organization.id,
        label,
        normalizedLabel: normalizeName(label),
        kind,
        displayOrder: i,
      },
    });
  }

  // Mirror seeded inbox customers into the CRM so the linked views have data.
  const entryStage = await prisma.pipelineStage.findFirstOrThrow({
    where: { pipelineId: pipeline.id, isEntry: true },
    select: { id: true },
  });
  const customers = await prisma.inboxCustomer.findMany({
    where: { organizationId: organization.id, contactId: null },
    include: { conversations: { include: { platform: true }, take: 1 } },
  });
  const sourceByPlatform: Record<string, string> = {
    whatsapp: 'WHATSAPP',
    messenger: 'FACEBOOK',
    instagram: 'INSTAGRAM',
    web: 'WEBSITE',
    phone: 'PHONE',
    email: 'MANUAL',
  };
  for (const customer of customers) {
    const platformCode = customer.conversations[0]?.platform.code ?? 'manual';
    // Reuse the inbox identity verbatim so a contact maps one-to-one onto the
    // customer, including the prefixed Messenger/Instagram handles.
    const normalizedPhone = customer.normalizedPhone;
    const contact = await prisma.contact.upsert({
      where: {
        organizationId_normalizedPhone: {
          organizationId: organization.id,
          normalizedPhone,
        },
      },
      update: {},
      create: {
        organizationId: organization.id,
        name: customer.name,
        normalizedName: normalizeName(customer.name),
        phone: customer.phone,
        normalizedPhone,
        source: (sourceByPlatform[platformCode] as 'WHATSAPP') ?? 'MANUAL',
        channelHandle: customer.conversations[0]?.platform.label ?? null,
        ownerName: 'النظام',
        lastActivityAt: customer.lastActivityAt,
      },
    });
    await prisma.inboxCustomer.update({
      where: { id: customer.id },
      data: { contactId: contact.id },
    });
    const open = await prisma.lead.findFirst({
      where: { contactId: contact.id, deletedAt: null, outcome: 'OPEN' },
      select: { id: true },
    });
    if (open) continue;
    await prisma.lead.create({
      data: {
        organizationId: organization.id,
        pipelineId: pipeline.id,
        stageId: entryStage.id,
        contactId: contact.id,
        currency,
        precision: 2,
        program: 'استفسار جديد من صندوق الوارد',
        createdAt: customer.firstContactAt,
        activities: {
          create: {
            kind: 'CREATED',
            label: 'أُنشئت الفرصة تلقائيًا من أول تواصل',
            actorName: 'النظام',
            occurredAt: customer.firstContactAt,
          },
        },
      },
    });
  }
}
