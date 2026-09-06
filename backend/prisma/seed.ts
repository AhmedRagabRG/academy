import { PrismaPg } from '@prisma/adapter-pg';
import { PasswordService } from '../src/core/auth/password.service';
import { PrismaClient } from './generated/client';
import { PERMISSION_CATALOG } from './seeds/permission-catalog';
import { normalizeArabic } from '../src/shared/utils/arabic-normalize';
import { seedOrganizationMasterData } from './seeds/organization-master-data';
import { seedTickets } from './seeds/tickets';
import { seedInbox } from './seeds/inbox';
import { seedCrm } from './seeds/crm';

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const connectionString = requiredEnvironment('DATABASE_URL');
const adminEmail = requiredEnvironment('SEED_ADMIN_EMAIL');
const adminPassword = requiredEnvironment('SEED_ADMIN_PASSWORD');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
  await prisma.permission.createMany({
    data: [...PERMISSION_CATALOG],
    skipDuplicates: true,
  });

  const role = await prisma.role.upsert({
    where: { code: 'super-admin' },
    update: {
      displayName: 'مدير النظام',
      normalizedDisplayName: normalizeArabic('مدير النظام'),
      status: 'ACTIVE',
    },
    create: {
      code: 'super-admin',
      displayName: 'مدير النظام',
      normalizedDisplayName: normalizeArabic('مدير النظام'),
      description: 'صلاحية الإدارة الكاملة للمنصة',
    },
  });
  const permissions = await prisma.permission.findMany({
    select: { id: true },
  });
  await prisma.rolePermission.createMany({
    data: permissions.map(({ id: permissionId }) => ({
      roleId: role.id,
      permissionId,
    })),
    skipDuplicates: true,
  });

  const passwordHash = await new PasswordService().hash(adminPassword);
  const account = await prisma.account.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {
      passwordHash,
      displayName: 'مدير النظام',
      normalizedDisplayName: normalizeArabic('مدير النظام'),
      status: 'ACTIVE',
    },
    create: {
      email: adminEmail.toLowerCase(),
      passwordHash,
      displayName: 'مدير النظام',
      normalizedDisplayName: normalizeArabic('مدير النظام'),
      organizationWide: true,
    },
  });
  await prisma.accountRole.upsert({
    where: { accountId_roleId: { accountId: account.id, roleId: role.id } },
    update: {},
    create: { accountId: account.id, roleId: role.id },
  });
  await seedOrganizationMasterData(prisma);
  await seedTickets(prisma);
  await seedInbox(prisma);
  // CRM last: mirrors the seeded inbox customers into contacts and leads.
  await seedCrm(prisma);
}

void main().finally(() => prisma.$disconnect());
