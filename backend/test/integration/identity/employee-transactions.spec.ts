import '../../load-env';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';
import { PasswordService } from '../../../src/core/auth/password.service';
import { DomainEventBus } from '../../../src/core/events/domain-event.bus';
import { TransactionManager } from '../../../src/database/transaction.manager';
import { PasswordPolicyService } from '../../../src/modules/identity/auth/password-policy.service';
import { EmployeePolicy } from '../../../src/modules/identity/employees/employee.policy';
import { EmployeeRepository } from '../../../src/modules/identity/employees/employee.repository';
import { EmployeeService } from '../../../src/modules/identity/employees/employee.service';
import { RoleRepository } from '../../../src/modules/identity/roles/role.repository';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const caller: CallerContext = {
  accountId: randomUUID(),
  sessionId: randomUUID(),
  displayName: 'مدير',
  email: 'admin@example.com',
  roles: [],
  permissionKeys: [],
  authorizedBranchIds: [],
  organizationWide: true,
  authenticatedAt: new Date().toISOString(),
};

describe('employee transactional security changes', () => {
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

  async function fixture() {
    const code = `tx-${randomUUID()}`;
    roleCodes.push(code);
    const role = await prisma.role.create({
      data: {
        code,
        displayName: code,
        normalizedDisplayName: code,
        description: '',
      },
    });
    const id = randomUUID();
    accountIds.push(id);
    const originalHash = await new PasswordService().hash('OriginalPass1!');
    await prisma.account.create({
      data: {
        id,
        email: `${id}@example.com`,
        passwordHash: originalHash,
        displayName: 'موظف معاملة',
        normalizedDisplayName: 'موظف معامله',
        phone: '+201000000001',
        branchIds: [randomUUID()],
        roles: { create: { roleId: role.id } },
      },
    });
    const sessions = {
      revokeAllInTransaction: jest
        .fn()
        .mockRejectedValue(new Error('session failure')),
    };
    const service = new EmployeeService(
      new EmployeeRepository(prisma as never),
      new RoleRepository(prisma as never),
      new PasswordService(),
      new PasswordPolicyService(
        new ConfigService({ passwordPolicy: { minLength: 12 } }),
      ),
      new EmployeePolicy(),
      sessions as never,
      new TransactionManager(prisma as never),
      new DomainEventBus(),
    );
    return { id, originalHash, service };
  }

  it('rolls back status when session revocation fails', async () => {
    const { id, service } = await fixture();
    await expect(
      service.status(caller, id, { status: 'INACTIVE', expectedVersion: 1 }),
    ).rejects.toThrow('session failure');
    expect(
      await prisma.account.findUniqueOrThrow({ where: { id } }),
    ).toMatchObject({ status: 'ACTIVE', version: 1 });
  });

  it('rolls back password/version when session revocation fails', async () => {
    const { id, originalHash, service } = await fixture();
    await expect(
      service.resetPassword(caller, id, {
        newPassword: 'ReplacementPass1!',
        confirmPassword: 'ReplacementPass1!',
        expectedVersion: 1,
      }),
    ).rejects.toThrow('session failure');
    expect(
      await prisma.account.findUniqueOrThrow({ where: { id } }),
    ).toMatchObject({ passwordHash: originalHash, version: 1 });
  });
});
