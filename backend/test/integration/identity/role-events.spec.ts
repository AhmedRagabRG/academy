import { RoleService } from '../../../src/modules/identity/roles/role.service';
import type { CallerContext } from '../../../src/shared/types/caller-context';

describe('role event timing and payloads', () => {
  it('emits permission replacement only after the transaction commits', async () => {
    const order: string[] = [];
    const record = {
      id: 'role',
      code: 'staff',
      displayName: 'موظف',
      description: '',
      status: 'ACTIVE',
      version: 2,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      permissions: [{ permissionId: 'p' }],
      _count: { accounts: 0 },
    };
    const service = new RoleService(
      {
        findById: jest.fn().mockResolvedValue({ ...record, version: 1 }),
        updateVersioned: jest.fn().mockResolvedValue({ count: 1 }),
      } as never,
      {
        findActiveByIds: jest.fn().mockResolvedValue([{ id: 'p' }]),
        replaceForRole: jest.fn().mockImplementation(() => {
          order.push('write');
          return Promise.resolve(record);
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
          expect(event.payload).toEqual({ permissionIds: ['p'] });
        }),
      } as never,
    );
    await service.replacePermissions(
      'role',
      { permissionIds: ['p'], expectedVersion: 1 },
      { accountId: 'actor' } as CallerContext,
    );
    expect(order).toEqual(['write', 'commit', 'event']);
  });
});
