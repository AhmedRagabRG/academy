import { SessionService } from '../../../src/modules/identity/sessions/session.service';

describe('multi-session lifecycle', () => {
  it('revokes one and then all others while preserving the current session', async () => {
    const active = new Set(['current', 'one', 'two']);
    const repository = {
      findValid: jest.fn((id: string) =>
        Promise.resolve(active.has(id) ? { id } : null),
      ),
      revoke: jest.fn((id: string) => Promise.resolve(active.delete(id))),
      revokeOthers: jest.fn((_account: string, current: string) => {
        let count = 0;
        for (const id of [...active])
          if (id !== current) {
            active.delete(id);
            count += 1;
          }
        return Promise.resolve(count);
      }),
    };
    const service = new SessionService(repository as never);
    await service.revoke('account', 'current', 'one');
    expect(await service.revokeOthers('account', 'current')).toEqual({
      revokedCount: 1,
    });
    expect([...active]).toEqual(['current']);
  });
});
