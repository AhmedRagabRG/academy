import { VersionConflictException } from '../../../src/core/exceptions';
import type { PrismaService } from '../../../src/database/prisma.service';
import { InboxService } from '../../../src/modules/inbox/inbox.service';
import type { InboxRealtimeService } from '../../../src/modules/inbox/inbox-realtime.service';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const caller: CallerContext = {
  accountId: 'account-id',
  displayName: 'موظف',
  email: 'employee@example.com',
  sessionId: 'session-id',
  roles: [],
  permissionKeys: ['inbox.view.all', 'inbox.ai.control'],
  organizationWide: true,
  authenticatedAt: new Date().toISOString(),
};

const state = (version = 3, turnSeq = 7) => ({
  conversationId: 'conversation-id',
  organizationId: 'organization-id',
  agentId: 'agent-id',
  mode: 'PAUSED' as const,
  pausedReason: 'MANUAL' as const,
  pausedAt: new Date('2026-09-10T00:00:00.000Z'),
  pausedByAccountId: caller.accountId,
  resumeAt: null,
  turnSeq,
  lastInboundMessageId: null,
  collectedFields: {},
  askedFields: [],
  summary: null,
  summarizedThroughMessageId: null,
  consecutiveFailures: 0,
  version,
  createdAt: new Date('2026-09-10T00:00:00.000Z'),
  updatedAt: new Date('2026-09-10T00:00:00.000Z'),
});

const setup = (current = state()) => {
  const db: Record<string, unknown> = {
    conversationAiState: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn().mockResolvedValue({ version: current.version }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        ...current,
        mode: 'AUTO',
        pausedReason: null,
        pausedAt: null,
        pausedByAccountId: null,
        turnSeq: current.turnSeq + 1,
        version: current.version + 1,
      }),
    },
    inboxSystemEvent: { create: jest.fn().mockResolvedValue({}) },
    aiAgent: { findUnique: jest.fn().mockResolvedValue({ enabled: true }) },
  };
  db.$transaction = jest.fn(
    (callback: (tx: Record<string, unknown>) => Promise<unknown>) =>
      callback(db),
  );
  const policy = { assert: jest.fn() };
  const realtime = { publish: jest.fn() };
  const service = new InboxService(
    { db } as unknown as { db: PrismaService } as never,
    policy as never,
    {} as never,
    {} as never,
    {} as never,
    realtime as unknown as InboxRealtimeService,
  );
  Object.defineProperty(service, 'full', {
    value: jest.fn().mockResolvedValue({ aiState: current }),
  });
  return { db, policy, realtime, service };
};

describe('InboxService.setAiMode', () => {
  it('throws VersionConflictException when the AI state version is stale', async () => {
    const { db, service } = setup(state(4));

    await expect(
      service.setAiMode(caller, 'conversation-id', {
        action: 'pause',
        expectedVersion: 3,
      }),
    ).rejects.toBeInstanceOf(VersionConflictException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('increments turnSeq when resuming', async () => {
    const { db, realtime, service } = setup();

    await service.setAiMode(caller, 'conversation-id', {
      action: 'resume',
      expectedVersion: 3,
    });

    const updateMany = (
      db.conversationAiState as {
        updateMany: jest.MockedFunction<
          (input: { data: { turnSeq?: { increment: number } } }) => unknown
        >;
      }
    ).updateMany;
    expect(updateMany.mock.calls[0]?.[0].data.turnSeq).toEqual({
      increment: 1,
    });
    expect(realtime.publish).toHaveBeenCalledTimes(1);
  });
});
