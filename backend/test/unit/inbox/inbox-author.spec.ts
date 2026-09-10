import { InboxService } from '../../../src/modules/inbox/inbox.service';

describe('Inbox message author projection', () => {
  it.each([
    ['CUSTOMER', 'customer'],
    ['HUMAN_AGENT', 'human-agent'],
    ['AI_AGENT', 'ai-agent'],
  ] as const)('maps %s to the wire value %s', (authorType, expected) => {
    const service = new InboxService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const project = (
      service as unknown as {
        project(row: unknown): { messages: Array<{ authorType: string }> };
      }
    ).project.bind(service);
    const result = project({
      id: 'conversation',
      customerId: 'customer',
      platformId: 'platform',
      status: 'OPEN',
      assignedEmployeeId: null,
      assignedTeamId: null,
      unreadCount: 0,
      lastMessage: 'message',
      lastActivityAt: new Date('2026-09-10T00:00:00.000Z'),
      version: 1,
      deletedAt: null,
      previousStatus: null,
      customer: {
        id: 'customer',
        name: 'عميل',
        phone: '+201000000000',
        avatarUrl: null,
        firstContactAt: new Date('2026-09-10T00:00:00.000Z'),
        lastActivityAt: new Date('2026-09-10T00:00:00.000Z'),
      },
      platform: { id: 'platform', label: 'واتساب', icon: 'icon', active: true },
      assignedEmployee: null,
      assignedTeam: null,
      tags: [],
      messages: [
        {
          id: 'message',
          conversationId: 'conversation',
          direction: 'OUTGOING',
          authorType,
          senderName: 'كاتب',
          body: 'نص',
          sentAt: new Date('2026-09-10T00:00:00.000Z'),
          delivery: 'SENT',
          attachments: [],
        },
      ],
      notes: [],
      assignmentHistory: [],
      systemEvents: [],
    });
    expect(result.messages[0]?.authorType).toBe(expected);
  });
});
