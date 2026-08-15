import '../../load-env';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';
import { normalizeArabic } from '../../../src/shared/utils/arabic-normalize';
import { EmployeeRepository } from '../../../src/modules/identity/employees/employee.repository';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

describe('employee search, scope, and pagination', () => {
  const accountIds: string[] = [];
  const roleCodes: string[] = [];
  afterAll(async () => {
    await prisma.accountRole.deleteMany({
      where: { accountId: { in: accountIds } },
    });
    await prisma.account.deleteMany({ where: { id: { in: accountIds } } });
    await prisma.role.deleteMany({ where: { code: { in: roleCodes } } });
    await prisma.$disconnect();
  });

  it('finds Arabic letter variants while enforcing branch scope and empty over-range pages', async () => {
    const code = `query-${randomUUID()}`;
    roleCodes.push(code);
    const role = await prisma.role.create({
      data: {
        code,
        displayName: `بحث ${code}`,
        normalizedDisplayName: `بحث ${code}`,
        description: '',
      },
    });
    const allowedBranch = randomUUID();
    for (const [name, branchId] of [
      ['أحمد', allowedBranch],
      ['محمود', randomUUID()],
    ] as const) {
      const id = randomUUID();
      accountIds.push(id);
      await prisma.account.create({
        data: {
          id,
          email: `${id}@example.com`,
          passwordHash: 'hash',
          displayName: name,
          normalizedDisplayName: normalizeArabic(name).toLowerCase(),
          phone: '+201000000001',
          branchIds: [branchId],
          roles: { create: { roleId: role.id } },
        },
      });
    }
    const repository = new EmployeeRepository(prisma as never);
    const result = await repository.list(
      {
        normalizedDisplayName: { contains: normalizeArabic('احمد') },
        branchIds: { hasSome: [allowedBranch] },
      },
      0,
      20,
      { displayName: 'asc' },
    );
    expect(result.items.map(({ displayName }) => displayName)).toEqual([
      'أحمد',
    ]);
    const overRange = await repository.list(
      { branchIds: { has: allowedBranch } },
      200,
      20,
      { displayName: 'asc' },
    );
    expect(overRange.items).toEqual([]);
    expect(overRange.total).toBe(1);
  });
});
