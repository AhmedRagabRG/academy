import { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../../src/database/prisma.service';
import { AiResumeSweeper } from '../../../src/modules/ai/runtime/ai-resume.sweeper';
import { InboxRealtimeService } from '../../../src/modules/inbox/inbox-realtime.service';

const database = (resumed: Array<{ conversationId: string }> = []) => {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue(resumed),
    conversationAiState: {
      findMany: jest.fn().mockResolvedValue(
        resumed.map(({ conversationId }) => ({
          conversationId,
          agentId: 'agent-id',
        })),
      ),
    },
    aiAgent: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'agent-id',
          name: 'المساعد الذكي',
          serviceAccountId: 'service-account-id',
        },
      ]),
    },
    inboxSystemEvent: {
      createMany: jest.fn().mockResolvedValue({ count: resumed.length }),
    },
  };
  const db = {
    ...tx,
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  };
  return { db, tx };
};

const config = (enabled = true) =>
  new ConfigService({
    ai: { resumeSweepEnabled: enabled, resumeSweepMs: 30000 },
  });

describe('AiResumeSweeper', () => {
  it('resumes a due row and records its system event with the service account', async () => {
    const { db, tx } = database([{ conversationId: 'conversation-id' }]);
    const sweeper = new AiResumeSweeper(
      db as unknown as PrismaService,
      config(),
      new InboxRealtimeService(),
    );

    await sweeper.tick();

    expect(tx.inboxSystemEvent.createMany).toHaveBeenCalledWith({
      data: [
        {
          conversationId: 'conversation-id',
          type: 'ai.resumed',
          label: 'استؤنف المساعد الذكي',
          actorId: 'service-account-id',
          actorName: 'المساعد الذكي',
        },
      ],
    });
  });

  it('leaves a not-yet-due row untouched', async () => {
    const { db, tx } = database();
    const sweeper = new AiResumeSweeper(
      db as unknown as PrismaService,
      config(),
      new InboxRealtimeService(),
    );

    await sweeper.tick();

    const query = tx.$queryRaw as jest.MockedFunction<
      (strings: TemplateStringsArray) => Promise<unknown>
    >;
    const sql = query.mock.calls[0]?.[0].join('') ?? '';
    expect(sql).toContain('"resumeAt" <= now()');
    expect(tx.inboxSystemEvent.createMany).not.toHaveBeenCalled();
  });

  it('leaves an escalated row untouched', async () => {
    const { db, tx } = database();
    const sweeper = new AiResumeSweeper(
      db as unknown as PrismaService,
      config(),
      new InboxRealtimeService(),
    );

    await sweeper.tick();

    const query = tx.$queryRaw as jest.MockedFunction<
      (strings: TemplateStringsArray) => Promise<unknown>
    >;
    const sql = query.mock.calls[0]?.[0].join('') ?? '';
    expect(sql).toContain("'HUMAN_REPLY','MANUAL'");
    expect(sql).not.toContain("'ESCALATED'");
    expect(tx.inboxSystemEvent.createMany).not.toHaveBeenCalled();
  });

  it('does not overlap ticks', async () => {
    const { db, tx } = database();
    let release!: (value: Array<{ conversationId: string }>) => void;
    tx.$queryRaw.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const sweeper = new AiResumeSweeper(
      db as unknown as PrismaService,
      config(),
      new InboxRealtimeService(),
    );

    const first = sweeper.tick();
    await Promise.resolve();
    await sweeper.tick();
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    release([]);
    await first;
  });

  it('respects the configuration kill-switch even when tick is called directly', async () => {
    const { db } = database([{ conversationId: 'conversation-id' }]);
    const sweeper = new AiResumeSweeper(
      db as unknown as PrismaService,
      config(false),
      new InboxRealtimeService(),
    );

    await sweeper.tick();

    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

/**
 * The badge in the inbox says "paused" until a client refetches, so a resume
 * that never reaches the SSE stream is invisible to the agent watching it.
 */
describe('AiResumeSweeper client notification', () => {
  const config = new ConfigService({
    ai: { resumeSweepEnabled: true, resumeSweepMs: 30000 },
  });
  it('publishes once when rows resumed and stays silent when none did', async () => {
    const resumedDb = {
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          $queryRaw: jest.fn().mockResolvedValue([{ conversationId: 'c-1' }]),
          conversationAiState: {
            findMany: jest
              .fn()
              .mockResolvedValue([{ conversationId: 'c-1', agentId: 'a-1' }]),
          },
          aiAgent: {
            findMany: jest
              .fn()
              .mockResolvedValue([
                { id: 'a-1', name: 'المساعد', serviceAccountId: 's-1' },
              ]),
          },
          inboxSystemEvent: { createMany: jest.fn().mockResolvedValue({}) },
        }),
      ),
    };
    const realtime = new InboxRealtimeService();
    const publish = jest.spyOn(realtime, 'publish');
    await new AiResumeSweeper(
      resumedDb as unknown as PrismaService,
      config,
      realtime,
    ).tick();
    expect(publish).toHaveBeenCalledTimes(1);

    const emptyDb = {
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
        callback({ $queryRaw: jest.fn().mockResolvedValue([]) }),
      ),
    };
    const quiet = new InboxRealtimeService();
    const quietPublish = jest.spyOn(quiet, 'publish');
    await new AiResumeSweeper(
      emptyDb as unknown as PrismaService,
      config,
      quiet,
    ).tick();
    expect(quietPublish).not.toHaveBeenCalled();
  });
});
