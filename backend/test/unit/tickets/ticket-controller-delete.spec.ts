import { TicketController } from '../../../src/modules/tickets/ticket.controller';
import type { TicketService } from '../../../src/modules/tickets/ticket.service';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const caller = { accountId: 'acc-1' } as CallerContext;

/**
 * The client deletes a ticket with no request body. Nest passes an absent body
 * through as `undefined`, not `{}`, so reading `expectedVersion` off it threw
 * and every delete returned 500. expectedVersion is genuinely optional on this
 * endpoint, so the bodiless call has to work.
 */
describe('TicketController.remove', () => {
  const build = () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    const controller = new TicketController({
      remove,
    } as unknown as TicketService);
    return { controller, remove };
  };

  it('deletes when the request carries no body at all', async () => {
    const { controller, remove } = build();
    await expect(
      controller.remove(caller, 'ticket-1', undefined),
    ).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith(caller, 'ticket-1', undefined);
  });

  it('deletes when the body is an empty object', async () => {
    const { controller, remove } = build();
    await controller.remove(caller, 'ticket-1', {});
    expect(remove).toHaveBeenCalledWith(caller, 'ticket-1', undefined);
  });

  it('still forwards expectedVersion when the client sends one', async () => {
    const { controller, remove } = build();
    await controller.remove(caller, 'ticket-1', { expectedVersion: 7 });
    expect(remove).toHaveBeenCalledWith(caller, 'ticket-1', 7);
  });
});
