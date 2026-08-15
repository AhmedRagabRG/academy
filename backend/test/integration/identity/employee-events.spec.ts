import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EmployeeService } from '../../../src/modules/identity/employees/employee.service';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const record = {
  id: 'employee',
  email: 'e@example.com',
  passwordHash: 'hash',
  displayName: 'موظف',
  normalizedDisplayName: 'موظف',
  phone: '+201000000001',
  position: null,
  departmentId: null,
  branchIds: ['branch'],
  organizationWide: false,
  avatar: null,
  status: 'ACTIVE',
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  roles: [],
};

describe('employee audit events', () => {
  it('declares create/update/status/reset event emissions and safe payload fields', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/modules/identity/employees/employee.service.ts'),
      'utf8',
    );
    for (const name of [
      'EmployeeCreated',
      'EmployeeUpdated',
      'EmployeeStatusChanged',
      'PasswordReset',
    ])
      expect(source).toContain(`IdentityEventName.${name}`);
    expect(source).not.toMatch(/payload:\s*\{[^}]*password/i);
  });

  it('emits a status event only after status and revocation commit', async () => {
    const order: string[] = [];
    const employees = {
      findById: jest
        .fn()
        .mockResolvedValueOnce(record)
        .mockResolvedValue({ ...record, status: 'INACTIVE', version: 2 }),
      setStatus: jest.fn().mockImplementation(() => {
        order.push('status');
        return Promise.resolve({ count: 1 });
      }),
    };
    const service = new EmployeeService(
      employees as never,
      {} as never,
      {} as never,
      {} as never,
      { assertTransition: jest.fn(), assertAssignments: jest.fn() },
      {
        revokeAllInTransaction: jest.fn().mockImplementation(() => {
          order.push('revoke');
          return Promise.resolve(1);
        }),
      } as never,
      {
        run: jest.fn(async (work: (tx: object) => Promise<unknown>) => {
          const result = await work({});
          order.push('commit');
          return result;
        }),
      } as never,
      {
        emit: jest.fn((event: { payload: unknown }) => {
          order.push('event');
          expect(event.payload).toMatchObject({
            previousStatus: 'ACTIVE',
            status: 'INACTIVE',
            sessionsRevoked: 1,
          });
        }),
      } as never,
    );
    await service.status(
      { accountId: 'actor', organizationWide: true } as CallerContext,
      'employee',
      {
        status: 'INACTIVE',
        expectedVersion: 1,
      },
    );
    expect(order).toEqual(['status', 'revoke', 'commit', 'event']);
  });
});
