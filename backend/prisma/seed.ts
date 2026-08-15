import { PrismaPg } from '@prisma/adapter-pg';
import { PasswordService } from '../src/core/auth/password.service';
import { PrismaClient } from './generated/client';
import { PERMISSION_CATALOG } from './seeds/permission-catalog';
import { normalizeArabic } from '../src/shared/utils/arabic-normalize';
import { seedOrganizationMasterData } from './seeds/organization-master-data';
import { seedAcademicCatalog } from './seeds/academic-catalog';
import { seedProgramBatches } from './seeds/program-batches';
import { seedAdmissions } from './seeds/admissions';
import { seedDocumentRequirements } from './seeds/document-requirements';
import { seedExpenseLookups } from './seeds/expense-lookups';
import { seedStudentFinance } from './seeds/student-finance';
import { seedTickets } from './seeds/tickets';
import { seedInbox } from './seeds/inbox';

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
  const retiredPermissions = await prisma.permission.findMany({
    where: { key: { in: ['catalog.types.create'] } },
    select: { id: true },
  });
  if (retiredPermissions.length) {
    const ids = retiredPermissions.map(({ id }) => id);
    await prisma.rolePermission.deleteMany({
      where: { permissionId: { in: ids } },
    });
    await prisma.permission.deleteMany({ where: { id: { in: ids } } });
  }
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
      branchIds: ['00000000-0000-0000-0000-000000000001'],
      organizationWide: true,
    },
  });
  await prisma.accountRole.upsert({
    where: { accountId_roleId: { accountId: account.id, roleId: role.id } },
    update: {},
    create: { accountId: account.id, roleId: role.id },
  });
  await seedOrganizationMasterData(prisma);
  await seedAcademicCatalog(prisma);
  await seedProgramBatches(prisma);
  await seedAdmissions(prisma);
  // Finance last: its charge-purpose group and the extra payment methods
  // extend master data the earlier seeds create.
  await seedStudentFinance(prisma);
  // The editable document lists, backfilled from the constants the two modules
  // used to hardcode. Idempotent, so it never overwrites a Settings edit.
  await seedDocumentRequirements(prisma);
  // Expense category pickers had no values, so a request could not be created.
  await seedExpenseLookups(prisma);
  await seedTickets(prisma);
  await seedInbox(prisma);
}

void main().finally(() => prisma.$disconnect());
