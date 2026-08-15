import { TicketRepository } from '../../../src/modules/tickets/ticket.repository';
import { TicketPolicy } from '../../../src/modules/tickets/ticket.policy';
import type { TicketListDto } from '../../../src/modules/tickets/dto/ticket.dto';
import { DomainException } from '../../../src/core/exceptions';

function expectCode(action: () => unknown, code: string) {
  try {
    action();
    throw new Error('expected cursor error');
  } catch (error) {
    expect(error).toBeInstanceOf(DomainException);
    expect((error as DomainException).code).toBe(code);
  }
}

describe('ticket cursor contract', () => {
  const repository = new TicketRepository({} as never, new TicketPolicy());
  const query: TicketListDto = {
    mode: 'active',
    sort: 'updated',
    pageSize: 20,
    status: ['todo', 'backlog'],
    priority: ['high'],
    search: ' Parent ',
  };

  it('normalizes set-like filters into the same fingerprint', () => {
    expect(repository.fingerprint(query)).toBe(
      repository.fingerprint({
        ...query,
        status: ['backlog', 'todo'],
        search: 'parent',
      }),
    );
  });

  it('round-trips a cursor only for its original normalized query', () => {
    const fingerprint = repository.fingerprint(query);
    const encoded = repository.encode({
      v: 1,
      fingerprint,
      sort: 'updated',
      id: 'ticket-id',
      snapshotAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      number: 'TKT-1',
    });
    expect(repository.decode(encoded, fingerprint, 'updated')?.id).toBe(
      'ticket-id',
    );
    expectCode(
      () =>
        repository.decode(
          encoded,
          repository.fingerprint({ ...query, search: 'other' }),
          'updated',
        ),
      'cursor-query-mismatch',
    );
  });

  it('rejects malformed and incomplete cursor tuples', () => {
    expectCode(
      () => repository.decode('not-base64-json', 'fingerprint', 'updated'),
      'cursor-invalid',
    );
    const incomplete = Buffer.from(
      JSON.stringify({
        v: 1,
        fingerprint: 'fingerprint',
        sort: 'updated',
        id: 'ticket-id',
      }),
    ).toString('base64url');
    expectCode(
      () => repository.decode(incomplete, 'fingerprint', 'updated'),
      'cursor-invalid',
    );
  });
});
