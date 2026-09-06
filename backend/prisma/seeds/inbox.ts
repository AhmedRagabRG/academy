import type { PrismaClient } from '../generated/client';
import { normalizeArabic } from '../../src/shared/utils/arabic-normalize';

const uuid = (group: string, value: number) =>
  `${group}0000-0000-4000-8000-${String(value).padStart(12, '0')}`;

export async function seedInbox(prisma: PrismaClient): Promise<void> {
  const organization = await prisma.organization.findFirstOrThrow({
    select: { id: true },
  });
  const accounts = await prisma.account.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    take: 3,
  });
  const teams = await prisma.ticketTeam.findMany({
    where: { organizationId: organization.id, active: true },
    orderBy: { createdAt: 'asc' },
    take: 2,
  });
  if (!accounts.length) return;
  const platformRows = [
    ['whatsapp', 'واتساب', 'MessageCircle'],
    ['messenger', 'فيسبوك ماسنجر', 'Facebook'],
    ['web', 'محادثة الموقع', 'MessageCircle'],
    ['email', 'البريد الإلكتروني', 'Mail'],
    ['phone', 'الهاتف', 'Phone'],
  ] as const;
  const platforms = [];
  for (let i = 0; i < platformRows.length; i++)
    platforms.push(
      // Keyed on the natural (organization, code) pair: the fixed ids drifted
      // when the Meta channels were prepended to this list.
      await prisma.inboxPlatform.upsert({
        where: {
          organizationId_code: {
            organizationId: organization.id,
            code: platformRows[i][0],
          },
        },
        update: {},
        create: {
          organizationId: organization.id,
          code: platformRows[i][0],
          label: platformRows[i][1],
          icon: platformRows[i][2],
        },
      }),
    );
  const tagRows = [
    ['lead', 'عميل محتمل', 'blue'],
    ['vip', 'VIP', 'violet'],
    ['follow', 'متابعة', 'amber'],
    ['payment', 'بانتظار الدفع', 'red'],
    ['registered', 'مسجّل', 'green'],
  ] as const;
  const tags = [];
  for (let i = 0; i < tagRows.length; i++)
    tags.push(
      await prisma.inboxTag.upsert({
        where: {
          organizationId_code: {
            organizationId: organization.id,
            code: tagRows[i][0],
          },
        },
        update: {},
        create: {
          organizationId: organization.id,
          code: tagRows[i][0],
          label: tagRows[i][1],
          color: tagRows[i][2],
        },
      }),
    );
  const names = [
    'مريم خالد',
    'يوسف أحمد',
    'نور محمود',
    'ليان سمير',
    'عمر عبد الرحمن',
    'جنى طارق',
    'آدم محمد',
    'سلمى حسين',
    'ملك إبراهيم',
    'زياد علي',
    'هنا عادل',
    'سيف مصطفى',
  ];
  const base = Date.parse('2026-08-10T08:00:00.000Z');
  const statuses = [
    'OPEN',
    'PENDING',
    'SNOOZED',
    'CLOSED',
    'ARCHIVED',
  ] as const;
  for (let i = 0; i < names.length; i++) {
    const customerId = uuid('3000', i + 1),
      conversationId = uuid('4000', i + 1);
    const lastActivityAt = new Date(base - i * 3_600_000);
    await prisma.inboxCustomer.upsert({
      where: { id: customerId },
      update: {},
      create: {
        id: customerId,
        organizationId: organization.id,
        name: names[i],
        normalizedName: normalizeArabic(names[i]),
        phone: `+20 10 5555 ${1100 + i}`,
        normalizedPhone: `20105555${1100 + i}`,
        firstContactAt: new Date(base - (20 + i) * 86_400_000),
        lastActivityAt,
      },
    });
    const unassigned = i % 4 === 3;
    await prisma.inboxConversation.upsert({
      where: { id: conversationId },
      update: {},
      create: {
        id: conversationId,
        organizationId: organization.id,
        customerId,
        platformId: platforms[i % platforms.length].id,
        status: statuses[i % statuses.length],
        assignedEmployeeId: unassigned
          ? null
          : accounts[i % accounts.length].id,
        assignedTeamId:
          unassigned || !teams.length ? null : teams[i % teams.length].id,
        unreadCount: i % 4,
        lastMessage:
          i % 2
            ? 'أحتاج معرفة مواعيد الدراسة والرسوم'
            : 'شكرًا، سأراجع المستندات وأعود إليكم',
        lastActivityAt,
        tags: {
          create: { tagId: tags[i % tags.length].id, addedBy: accounts[0].id },
        },
        messages: {
          create: [
            {
              id: uuid('5000', i * 2 + 1),
              direction: 'INCOMING',
              senderName: names[i],
              body: 'مرحبًا، أريد الاستفسار عن البرنامج المناسب.',
              sentAt: new Date(lastActivityAt.getTime() - 3_600_000),
              delivery: 'RECEIVED',
            },
            {
              id: uuid('5000', i * 2 + 2),
              direction: 'OUTGOING',
              senderName: accounts[0].displayName,
              body: 'أهلًا بك، يسعدني مساعدتك. ما المرحلة الدراسية؟',
              sentAt: lastActivityAt,
              delivery: 'READ',
              createdBy: accounts[0].id,
            },
          ],
        },
        ...(i === 0
          ? {
              notes: {
                create: {
                  id: uuid('6000', 1),
                  authorEmployeeId: accounts[0].id,
                  authorName: accounts[0].displayName,
                  content: 'العميلة مهتمة بالتسجيل المبكر.',
                  createdAt: lastActivityAt,
                },
              },
            }
          : {}),
      },
    });
  }
}
