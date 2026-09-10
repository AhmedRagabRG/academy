import { AiEligibilityService } from '../../../../src/modules/ai/runtime/ai-eligibility.service';
import type { PrismaService } from '../../../../src/database/prisma.service';

const agent = (overrides: Record<string, unknown> = {}) => ({
  id: 'agent-1',
  organizationId: 'org-1',
  enabled: true,
  enabledPlatformCodes: ['whatsapp'],
  knowledgeBases: [{ knowledgeBaseId: 'kb-1' }],
  ...overrides,
});

const conversation = (overrides: Record<string, unknown> = {}) => ({
  id: 'conv-1',
  organizationId: 'org-1',
  customerId: 'customer-1',
  status: 'OPEN',
  platform: { code: 'whatsapp' },
  customer: { contactId: 'contact-1' },
  ...overrides,
});

const harness = (options: {
  conversation?: Record<string, unknown> | null;
  state?: Record<string, unknown> | null;
  agent?: Record<string, unknown> | null;
  resumeCount?: number;
}) => {
  const db = {
    inboxConversation: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          options.conversation === undefined
            ? conversation()
            : options.conversation,
        ),
    },
    conversationAiState: {
      findUnique: jest.fn().mockResolvedValue(
        options.state === undefined
          ? {
              conversationId: 'conv-1',
              agentId: 'agent-1',
              mode: 'AUTO',
              turnSeq: 5,
              resumeAt: null,
            }
          : options.state,
      ),
      updateMany: jest
        .fn()
        .mockResolvedValue({ count: options.resumeCount ?? 1 }),
    },
    aiAgent: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          options.agent === undefined ? agent() : options.agent,
        ),
    },
  };
  return {
    service: new AiEligibilityService(db as unknown as PrismaService),
    db,
  };
};

describe('AiEligibilityService', () => {
  it('admits an eligible turn with the current fencing token', async () => {
    const { service } = harness({});
    const check = await service.check('conv-1');
    expect(check).toMatchObject({
      eligible: true,
      turnSeq: 5,
      knowledgeBaseIds: ['kb-1'],
      contactId: 'contact-1',
    });
  });

  it('skips an archived or deleted conversation', async () => {
    const { service } = harness({
      conversation: conversation({ status: 'ARCHIVED' }),
    });
    expect(await service.check('conv-1')).toEqual({
      eligible: false,
      reason: 'conversation-closed',
    });
    const { service: deleted } = harness({ conversation: null });
    expect(await deleted.check('conv-1')).toEqual({
      eligible: false,
      reason: 'conversation-closed',
    });
  });

  it('skips when there is no AI state or the mode is OFF', async () => {
    const { service } = harness({ state: null });
    expect(await service.check('conv-1')).toMatchObject({
      eligible: false,
      reason: 'no-ai-state',
    });
    const { service: off } = harness({
      state: { mode: 'OFF', turnSeq: 1, agentId: 'a' },
    });
    expect(await off.check('conv-1')).toMatchObject({
      eligible: false,
      reason: 'mode-off',
    });
  });

  it('skips a pause that is not yet due and does not resume it', async () => {
    const { service, db } = harness({
      state: {
        mode: 'PAUSED',
        turnSeq: 5,
        agentId: 'agent-1',
        resumeAt: new Date(Date.now() + 600_000),
        pausedReason: 'HUMAN_REPLY',
      },
    });
    expect(await service.check('conv-1')).toMatchObject({
      eligible: false,
      reason: 'mode-paused',
    });
    expect(db.conversationAiState.updateMany).not.toHaveBeenCalled();
  });

  it('never auto-resumes a handoff or escalation, even when resumeAt is in the past', async () => {
    for (const pausedReason of ['HANDOFF', 'ESCALATED', 'ERROR_BUDGET']) {
      const { service, db } = harness({
        state: {
          mode: 'PAUSED',
          turnSeq: 5,
          agentId: 'agent-1',
          resumeAt: new Date(Date.now() - 600_000),
          pausedReason,
        },
      });
      expect(await service.check('conv-1')).toMatchObject({
        eligible: false,
        reason: 'mode-paused',
      });
      expect(db.conversationAiState.updateMany).not.toHaveBeenCalled();
    }
  });

  it('lazily resumes a due pause and fences with the incremented token', async () => {
    const { service, db } = harness({
      state: {
        mode: 'PAUSED',
        turnSeq: 5,
        agentId: 'agent-1',
        resumeAt: new Date(Date.now() - 1000),
        pausedReason: 'HUMAN_REPLY',
      },
    });
    const check = await service.check('conv-1');
    expect(check).toMatchObject({ eligible: true, turnSeq: 6 });
    expect(db.conversationAiState.updateMany).toHaveBeenCalledWith({
      where: { conversationId: 'conv-1', turnSeq: 5, mode: 'PAUSED' },
      data: {
        mode: 'AUTO',
        pausedReason: null,
        pausedAt: null,
        resumeAt: null,
        turnSeq: { increment: 1 },
        version: { increment: 1 },
      },
    });
  });

  it('skips when the lazy resume loses the race to another writer', async () => {
    const { service } = harness({
      state: {
        mode: 'PAUSED',
        turnSeq: 5,
        agentId: 'agent-1',
        resumeAt: new Date(Date.now() - 1000),
        pausedReason: 'MANUAL',
      },
      resumeCount: 0,
    });
    expect(await service.check('conv-1')).toMatchObject({
      eligible: false,
      reason: 'mode-paused',
    });
  });

  it('skips a missing, disabled, or out-of-channel agent', async () => {
    const missing = harness({ agent: null });
    expect(await missing.service.check('conv-1')).toMatchObject({
      eligible: false,
      reason: 'agent-missing',
    });

    const disabled = harness({ agent: agent({ enabled: false }) });
    expect(await disabled.service.check('conv-1')).toMatchObject({
      eligible: false,
      reason: 'agent-disabled',
    });

    const channel = harness({
      agent: agent({ enabledPlatformCodes: ['messenger'] }),
    });
    expect(await channel.service.check('conv-1')).toMatchObject({
      eligible: false,
      reason: 'channel-disabled',
    });
  });

  it('skips an agent with no knowledge base bound — nothing to answer from', async () => {
    const { service } = harness({ agent: agent({ knowledgeBases: [] }) });
    expect(await service.check('conv-1')).toMatchObject({
      eligible: false,
      reason: 'no-knowledge-base',
    });
  });
});
