import { AiTurnEnqueueService } from '../../../../src/modules/ai/runtime/ai-turn-enqueue.service';
import type { PrismaService } from '../../../../src/database/prisma.service';

/**
 * A conversation carries no AI state until an enabled agent first covers it.
 * Nothing used to create that row, so the enqueue path always found nothing and
 * the inbox reported the assistant disabled on every conversation.
 */
const harness = (options: {
  state?: unknown;
  conversation?: unknown;
  agent?: unknown;
}) => {
  const create = jest.fn().mockResolvedValue({
    agentId: 'agent-1',
    turnSeq: 0,
    mode: 'AUTO',
    organizationId: 'org-1',
  });
  const add = jest.fn().mockResolvedValue(undefined);
  const db = {
    conversationAiState: {
      findUnique: jest.fn().mockResolvedValue(options.state ?? null),
      create,
    },
    inboxConversation: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          options.conversation === undefined
            ? { organizationId: 'org-1', platform: { code: 'whatsapp' } }
            : options.conversation,
        ),
    },
    aiAgent: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          options.agent === undefined
            ? { id: 'agent-1', enabledPlatformCodes: ['whatsapp'] }
            : options.agent,
        ),
    },
    aiTurn: { create: jest.fn().mockResolvedValue({ id: 'turn-1' }) },
  };
  const service = new AiTurnEnqueueService(
    db as unknown as PrismaService,
    {
      add,
    } as never,
  );
  return { service, db, create, add };
};

describe('AiTurnEnqueueService state creation', () => {
  it('creates the state row on the first covered inbound message', async () => {
    const { service, create, add } = harness({});
    await service.enqueue('conversation-1');
    const [args] = create.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(args.data).toMatchObject({
      conversationId: 'conversation-1',
      agentId: 'agent-1',
    });
    expect(add).toHaveBeenCalled();
  });

  it('reuses an existing row rather than creating a second', async () => {
    const { service, create, add } = harness({
      state: {
        agentId: 'agent-1',
        turnSeq: 7,
        mode: 'AUTO',
        organizationId: 'org-1',
      },
    });
    await service.enqueue('conversation-1');
    expect(create).not.toHaveBeenCalled();
    expect(add).toHaveBeenCalled();
  });

  it('creates nothing when no agent is enabled', async () => {
    const { service, create, add } = harness({ agent: null });
    await service.enqueue('conversation-1');
    expect(create).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
  });

  it('creates nothing when the agent does not cover this channel', async () => {
    // An absent row means "the AI was never in play here", which is a different
    // thing from "it is paused" — so it must not be created speculatively.
    const { service, create, add } = harness({
      agent: { id: 'agent-1', enabledPlatformCodes: ['instagram'] },
    });
    await service.enqueue('conversation-1');
    expect(create).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
  });

  it('does not enqueue when the conversation is gone', async () => {
    const { service, add } = harness({ conversation: null });
    await service.enqueue('conversation-1');
    expect(add).not.toHaveBeenCalled();
  });

  it('stays silent when the AI has been switched off for the conversation', async () => {
    const { service, add } = harness({
      state: {
        agentId: 'agent-1',
        turnSeq: 1,
        mode: 'OFF',
        organizationId: 'org-1',
      },
    });
    await service.enqueue('conversation-1');
    expect(add).not.toHaveBeenCalled();
  });
});
