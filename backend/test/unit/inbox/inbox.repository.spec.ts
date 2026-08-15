import { InboxPolicy } from '../../../src/modules/inbox/inbox.policy';
import { InboxRepository } from '../../../src/modules/inbox/inbox.repository';
import { InboxListDto } from '../../../src/modules/inbox/dto/inbox.dto';

describe('InboxRepository cursor', () => {
  const repository = new InboxRepository({} as never, new InboxPolicy());
  it('round-trips an opaque query-bound cursor', () => {
    const query = new InboxListDto();
    const fingerprint = repository.fingerprint(query);
    const encoded = repository.encode({
      v: 1,
      fingerprint,
      id: 'row',
      snapshotAt: '2026-08-10T00:00:00.000Z',
      lastActivityAt: '2026-08-09T00:00:00.000Z',
      unreadCount: 3,
    });
    expect(encoded).not.toContain('row');
    expect(repository.decode(encoded, fingerprint)?.id).toBe('row');
    query.search = 'different';
    expect(() =>
      repository.decode(encoded, repository.fingerprint(query)),
    ).toThrow('مؤشر الصفحة لا يخص هذا الاستعلام');
  });
  it('uses deterministic id tie breakers for every sort', () => {
    const q = new InboxListDto();
    const cursor = {
      v: 1 as const,
      fingerprint: 'x',
      id: 'row',
      snapshotAt: '2026-08-10T00:00:00.000Z',
      lastActivityAt: '2026-08-09T00:00:00.000Z',
      unreadCount: 3,
    };
    expect(Array.isArray(repository.cursorWhere(q, cursor).OR)).toBe(true);
    q.sort = 'oldest';
    expect(Array.isArray(repository.cursorWhere(q, cursor).OR)).toBe(true);
    q.sort = 'unread';
    expect(Array.isArray(repository.cursorWhere(q, cursor).OR)).toBe(true);
  });
});
