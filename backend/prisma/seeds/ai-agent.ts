import { randomBytes } from 'node:crypto';
import type { PrismaClient } from '../generated/client';
import { PasswordService } from '../../src/core/auth/password.service';
import { normalizeArabic } from '../../src/shared/utils/arabic-normalize';

const AI_ROLE_ID = '00000000-0000-4000-8000-00000000a101';
const AI_ACCOUNT_ID = '00000000-0000-4000-8000-00000000a102';
const AI_AGENT_ID = '00000000-0000-4000-8000-00000000a103';
const AI_ACCOUNT_EMAIL = 'ai-agent@internal.alsalam.academy';
const AI_PERMISSIONS = [
  'tickets.create',
  'contacts.view',
  'contacts.update',
  'contacts.notes.manage',
  'inbox.reply',
] as const;

const SUPPORT_TEAM_NAME = 'فريق الدعم';

export async function seedAiAgent(prisma: PrismaClient): Promise<void> {
  const organization = await prisma.organization.findFirstOrThrow({
    select: { id: true },
  });
  const role = await prisma.role.upsert({
    where: { id: AI_ROLE_ID },
    update: {
      code: 'ai-agent',
      displayName: 'المساعد الذكي',
      normalizedDisplayName: normalizeArabic('المساعد الذكي'),
      status: 'ACTIVE',
    },
    create: {
      id: AI_ROLE_ID,
      code: 'ai-agent',
      displayName: 'المساعد الذكي',
      normalizedDisplayName: normalizeArabic('المساعد الذكي'),
      description: 'حساب خدمة مقيّد لوكيل الذكاء الاصطناعي',
    },
  });
  const permissions = await prisma.permission.findMany({
    where: { key: { in: [...AI_PERMISSIONS] } },
    select: { id: true, key: true },
  });
  if (permissions.length !== AI_PERMISSIONS.length)
    throw new Error('AI service-account permissions are missing from catalog');
  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  await prisma.rolePermission.createMany({
    data: permissions.map(({ id: permissionId }) => ({
      roleId: role.id,
      permissionId,
    })),
  });
  const passwordHash = await new PasswordService().hash(
    randomBytes(48).toString('base64url'),
  );
  // The AI is a real restricted account rather than a fabricated CallerContext,
  // so validations, policies, and createdBy work unchanged, and a synthetic
  // context can never become a privilege-escalation primitive.
  const account = await prisma.account.upsert({
    where: { id: AI_ACCOUNT_ID },
    update: {
      email: AI_ACCOUNT_EMAIL,
      passwordHash,
      displayName: 'المساعد الذكي',
      normalizedDisplayName: normalizeArabic('المساعد الذكي'),
      status: 'ACTIVE',
      // The AI acts on whatever customer contact its conversation belongs to,
      // so org-wide visibility is part of its role, not a permission grant.
      organizationWide: true,
    },
    create: {
      id: AI_ACCOUNT_ID,
      email: AI_ACCOUNT_EMAIL,
      passwordHash,
      displayName: 'المساعد الذكي',
      normalizedDisplayName: normalizeArabic('المساعد الذكي'),
      status: 'ACTIVE',
      organizationWide: true,
    },
  });
  await prisma.accountRole.deleteMany({ where: { accountId: account.id } });
  await prisma.accountRole.upsert({
    where: { accountId_roleId: { accountId: account.id, roleId: role.id } },
    update: {},
    create: { accountId: account.id, roleId: role.id },
  });
  await prisma.aiAgent.upsert({
    where: { id: AI_AGENT_ID },
    update: { serviceAccountId: account.id },
    create: {
      id: AI_AGENT_ID,
      organizationId: organization.id,
      name: 'المساعد الذكي الافتراضي',
      enabled: false,
      systemInstructions:
        'ساعد عملاء أكاديمية السلام بدقة ووضوح، ولا تدّع معرفة معلومات غير متاحة.',
      tone: 'ودود ومهني',
      responseLanguage: 'ar',
      model: 'gpt-4o',
      temperature: 0.3,
      maxResponseChars: 1200,
      enabledPlatformCodes: [],
      outsideHoursBehaviour: 'silent',
      resumeAfterMinutes: null,
      fallbackMessage:
        'عذرًا، لا أملك معلومات كافية للإجابة بدقة. سأحوّل المحادثة إلى أحد موظفينا.',
      handoffMessage: 'سيكمل أحد موظفينا مساعدتك في أقرب وقت.',
      allowedTools: [],
      allowedCrmFields: [],
      dataCollectionFields: [
        {
          key: 'name',
          label: 'الاسم',
          required: true,
          promptHint: 'اسأل العميل عن اسمه إن لم يكون مسجلًا',
        },
        {
          key: 'email',
          label: 'البريد الإلكتروني',
          required: false,
          promptHint: 'اسأل عن البريد الإلكتروني عند الحاجة',
        },
      ],
      serviceAccountId: account.id,
    },
  });

  // Seed starter routing rules without ever clobbering admin edits: the
  // update branch is empty on purpose. `complaint` is deliberately left
  // unassigned so an escalation always has a valid category to land in.
  const supportTeam = await prisma.ticketTeam.findFirst({
    where: { organizationId: organization.id, name: SUPPORT_TEAM_NAME },
    select: { id: true },
  });
  const starterRules = [
    {
      category: 'general-question',
      categoryLabel: 'استفسار عام',
      teamId: supportTeam?.id ?? null,
      priority: 'MEDIUM' as const,
      displayOrder: 1,
    },
    {
      category: 'enrollment',
      categoryLabel: 'طلب تسجيل في دورة',
      teamId: supportTeam?.id ?? null,
      priority: 'HIGH' as const,
      displayOrder: 2,
    },
    {
      category: 'complaint',
      categoryLabel: 'شكوى',
      teamId: null,
      priority: 'HIGH' as const,
      displayOrder: 3,
    },
  ];
  for (const rule of starterRules) {
    await prisma.aiTicketRoutingRule.upsert({
      where: {
        agentId_category: { agentId: AI_AGENT_ID, category: rule.category },
      },
      update: {},
      create: {
        ...rule,
        organizationId: organization.id,
        agentId: AI_AGENT_ID,
      },
    });
  }
}
