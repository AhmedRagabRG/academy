import { PERMISSION_CATALOG } from '../../../prisma/seeds/permission-catalog';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TicketController } from '../../../src/modules/tickets/ticket.controller';
import { TicketListDto } from '../../../src/modules/tickets/dto/ticket.dto';

describe('Ticket backend contract', () => {
  it('accepts comma-joined array filters emitted by the shared frontend client', async () => {
    const query = plainToInstance(TicketListDto, {
      status: 'todo,waiting',
      priority: 'high,critical',
      tag: 'urgent,follow-up',
    });

    expect(await validate(query)).toHaveLength(0);
    expect(query.status).toEqual(['todo', 'waiting']);
    expect(query.priority).toEqual(['high', 'critical']);
    expect(query.tag).toEqual(['urgent', 'follow-up']);
  });

  it('publishes exactly the 15 required permission keys', () => {
    const keys = PERMISSION_CATALOG.filter(
      (p) => p.moduleKey === 'tickets',
    ).map((p) => p.key);
    expect(keys).toHaveLength(15);
    expect(keys).toEqual(
      expect.arrayContaining([
        'tickets.view.assigned',
        'tickets.view.team',
        'tickets.view.all',
        'tickets.create',
        'tickets.edit',
        'tickets.assign.team',
        'tickets.assign.employee',
        'tickets.reassign',
        'tickets.change.status',
        'tickets.change.priority',
        'tickets.archive',
        'tickets.comment',
        'tickets.attach.files',
        'tickets.restore',
        'tickets.delete',
      ]),
    );
  });

  it('registers the complete controller surface', () => {
    const methods = Object.getOwnPropertyNames(TicketController.prototype);
    expect(methods).toEqual(
      expect.arrayContaining([
        'configuration',
        'dashboard',
        'list',
        'get',
        'create',
        'update',
        'status',
        'priority',
        'assignment',
        'comments',
        'comment',
        'editComment',
        'deleteComment',
        'activity',
        'upload',
        'download',
        'archive',
        'restore',
        'remove',
      ]),
    );
  });
});
