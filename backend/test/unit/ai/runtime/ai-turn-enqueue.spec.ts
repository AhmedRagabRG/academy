import { AiTurnEnqueueService } from '../../../../src/modules/ai/runtime/ai-turn-enqueue.service';
import type { Queue } from 'bullmq';
import type { PrismaService } from '../../../../src/database/prisma.service';

const CONVERSATION_ID = '123e4567-e89b-12d3-a456-426614174000';

interface AddOptions {
  jobId: string;
  delay: number;
  removeOnComplete: boolean;
  removeOnFail: boolean;
}

const db = (state: Record<string, unknown> | null) => {
  const create = jest.fn<Promise<{ id: string }>, [data: unknown]>();
  create.mockResolvedValue({ id: 'turn-1' });
  return {
    handle: {
      conversationAiState: { findUnique: jest.fn().mockResolvedValue(state) },
      aiTurn: { create },
    } as unknown as PrismaService,
    create,
  };
};

const queue = () => {
  const add = jest.fn<Promise<void>, [string, unknown, AddOptions]>();
  return { q: { add } as unknown as Queue, add };
};

const state = (overrides: Record<string, unknown> = {}) => ({
  agentId: 'agent-1',
  turnSeq: 3,
  mode: 'AUTO',
  organizationId: 'org-1',
  ...overrides,
});

describe('AiTurnEnqueueService', () => {
  it('mints the turn row first, then adds a job with a BullMQ-safe id', async () => {
    const { q, add } = queue();
    const { handle: database, create } = db(state());
    const service = new AiTurnEnqueueService(database, q);
    await service.enqueue(CONVERSATION_ID);
    const [name, payload, options] = add.mock.calls[0];
    expect(name).toBe('turn');
    expect(payload).toEqual({
      conversationId: CONVERSATION_ID,
      aiTurnId: 'turn-1',
    });
    // BullMQ 6 rejects custom ids containing ':' — and the reused debounce id
    // must survive completion, hence removal instead of retention.
    expect(options.jobId).toBe(`ai-${CONVERSATION_ID}`);
    expect(options.jobId).not.toContain(':');
    expect(options.delay).toBe(4000);
    expect(options.removeOnComplete).toBe(true);
    expect(options.removeOnFail).toBe(true);
    expect(create.mock.invocationCallOrder[0]).toBeLessThan(
      add.mock.invocationCallOrder[0],
    );
  });

  it('mints the follow-up with a unique id so it is not no-opped by the active job', async () => {
    const { q, add } = queue();
    const service = new AiTurnEnqueueService(db(state()).handle, q);
    await service.enqueueFollowUp(CONVERSATION_ID, 'fenced-turn-id');
    const [, , options] = add.mock.calls[0];
    expect(options.jobId).toBe(`ai-${CONVERSATION_ID}-after-fenced-turn-id`);
  });

  it('does nothing when the conversation has no AI state or the AI is off', async () => {
    const { q, add } = queue();
    const service = new AiTurnEnqueueService(db(null).handle, q);
    await service.enqueue(CONVERSATION_ID);
    const serviceOff = new AiTurnEnqueueService(
      db(state({ mode: 'OFF' })).handle,
      q,
    );
    await serviceOff.enqueue(CONVERSATION_ID);
    expect(add).not.toHaveBeenCalled();
  });

  it('swallows queue failures: the webhook already committed the message', async () => {
    const { q, add } = queue();
    add.mockRejectedValue(new Error('redis down'));
    const service = new AiTurnEnqueueService(db(state()).handle, q);
    await expect(service.enqueue(CONVERSATION_ID)).resolves.toBeUndefined();
    await expect(
      service.enqueueFollowUp(CONVERSATION_ID, 'turn-1'),
    ).resolves.toBeUndefined();
  });

  it('is inert when no queue is provided (AI queue disabled)', async () => {
    const service = new AiTurnEnqueueService(db(state()).handle);
    await expect(service.enqueue(CONVERSATION_ID)).resolves.toBeUndefined();
  });
});
