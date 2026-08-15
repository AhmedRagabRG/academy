import '../../load-env';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';
import { EmployeeRepository } from '../../../src/modules/identity/employees/employee.repository';
import { RoleRepository } from '../../../src/modules/identity/roles/role.repository';
import { RefreshTokenRepository } from '../../../src/core/auth/refresh-token.repository';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const prismaService = prisma as never;

describe('identity repositories', () => {
  const ids: string[] = [];
  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { accountId: { in: ids } } });
    await prisma.accountRole.deleteMany({ where: { accountId: { in: ids } } });
    await prisma.account.deleteMany({ where: { id: { in: ids } } });
    await prisma.role.deleteMany({ where: { code: { startsWith: 'test-' } } });
    await prisma.$disconnect();
  });

  it('enforces email/assignment uniqueness and unions multiple role permissions', async () => {
    const permission = await prisma.permission.findFirstOrThrow({
      where: { active: true },
    });
    const roles = new RoleRepository(prismaService);
    const firstRole = await roles.create({
      code: `test-${randomUUID()}`,
      displayName: `اختبار ${randomUUID()}`,
      normalizedDisplayName: `test-${randomUUID()}`,
      description: 'test',
      permissions: { create: [{ permissionId: permission.id }] },
    });
    const secondRole = await roles.create({
      code: `test-${randomUUID()}`,
      displayName: `اختبار ${randomUUID()}`,
      normalizedDisplayName: `test-${randomUUID()}`,
      description: 'test',
    });
    const id = randomUUID();
    ids.push(id);
    const employees = new EmployeeRepository(prismaService);
    await employees.create(
      {
        id,
        email: `${id}@example.com`,
        passwordHash: 'hash',
        displayName: 'موظف اختبار',
        normalizedDisplayName: 'موظف اختبار',
        phone: '+201000000001',
        branchIds: [randomUUID()],
        organizationWide: false,
      },
      [firstRole.id, secondRole.id],
    );
    const loaded = await employees.findById(id);
    expect(loaded?.roles).toHaveLength(2);
    expect(
      new Set(
        loaded?.roles.flatMap(({ role }) =>
          role.permissions.map(({ permission }) => permission.key),
        ),
      ).size,
    ).toBe(1);
    await expect(
      employees.create(
        {
          email: `${id}@example.com`,
          passwordHash: 'hash',
          displayName: 'مكرر',
          normalizedDisplayName: 'مكرر',
          phone: '+201000000002',
          branchIds: [randomUUID()],
        },
        [firstRole.id],
      ),
    ).rejects.toBeDefined();
  });

  it('applies optimistic concurrency and session validity predicates', async () => {
    const role = await prisma.role.findFirstOrThrow({
      where: { code: { startsWith: 'test-' } },
    });
    const id = randomUUID();
    ids.push(id);
    const employees = new EmployeeRepository(prismaService);
    await employees.create(
      {
        id,
        email: `${id}@example.com`,
        passwordHash: 'hash',
        displayName: 'موظف إصدار',
        normalizedDisplayName: 'موظف اصدار',
        phone: '+201000000003',
        branchIds: [randomUUID()],
      },
      [role.id],
    );
    expect(
      (await employees.updateVersioned(id, 1, { displayName: 'محدث' })).count,
    ).toBe(1);
    expect(
      (await employees.updateVersioned(id, 1, { displayName: 'قديم' })).count,
    ).toBe(0);
    const sessions = new RefreshTokenRepository(prismaService);
    const sessionId = randomUUID();
    await sessions.create(
      sessionId,
      id,
      'hash',
      new Date(Date.now() + 60_000),
      {
        device: 'Desktop',
        browser: 'Chrome',
        ipAddress: '127.0.0.1',
      },
    );
    expect(await sessions.findValidById(sessionId, id)).not.toBeNull();
    await sessions.revoke(sessionId, id);
    expect(await sessions.findValidById(sessionId, id)).toBeNull();
  });
});
