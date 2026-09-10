import {
  DomainException,
  VersionConflictException,
} from '../../../../src/core/exceptions';
import { AiAgentService } from '../../../../src/modules/ai/agent/ai-agent.service';
import type { AiAgentRepository } from '../../../../src/modules/ai/agent/ai-agent.repository';
import type { CallerContext } from '../../../../src/shared/types/caller-context';

const caller = { accountId: 'account-1', displayName: 'مدير' } as CallerContext;

const agent = (overrides: Record<string, unknown> = {}) => ({
  id: 'agent-1',
  organizationId: 'org-1',
  name: 'المساعد',
  enabled: false,
  systemInstructions: 'x',
  tone: 'ودود',
  responseLanguage: 'ar',
  maxResponseChars: 1200,
  enabledPlatformCodes: [],
  resumeAfterMinutes: null,
  fallbackMessage: 'f',
  handoffMessage: 'h',
  knowledgeBases: [],
  version: 1,
  updatedAt: new Date('2026-09-10T00:00:00Z'),
  ...overrides,
});

const repository = (overrides: Partial<AiAgentRepository> = {}) =>
  ({
    organizationId: jest.fn().mockResolvedValue('org-1'),
    byId: jest.fn().mockResolvedValue(agent()),
    platformCodes: jest
      .fn()
      .mockResolvedValue(['whatsapp', 'messenger', 'instagram']),
    knowledgeBaseIds: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(agent({ version: 2 })),
    list: jest.fn().mockResolvedValue([]),
    ...overrides,
  }) as unknown as AiAgentRepository;

describe('AiAgentService', () => {
  it('rejects a platform code the organization does not have', async () => {
    const service = new AiAgentService(repository());
    await expect(
      service.update(caller, 'agent-1', {
        expectedVersion: 1,
        enabledPlatformCodes: ['whatsapp', 'telegram'],
      }),
    ).rejects.toBeInstanceOf(DomainException);
  });

  it('accepts platform codes the organization does have', async () => {
    const service = new AiAgentService(repository());
    await expect(
      service.update(caller, 'agent-1', {
        expectedVersion: 1,
        enabledPlatformCodes: ['whatsapp'],
      }),
    ).resolves.toMatchObject({ version: 2 });
  });

  it('rejects a knowledge base id that does not resolve', async () => {
    const service = new AiAgentService(
      // Two requested, only one found: the missing one may be another org's or
      // soft-deleted, and either way must not be bound.
      repository({
        knowledgeBaseIds: jest.fn().mockResolvedValue(['kb-1']),
      }),
    );
    await expect(
      service.update(caller, 'agent-1', {
        expectedVersion: 1,
        knowledgeBaseIds: ['kb-1', 'kb-2'],
      }),
    ).rejects.toBeInstanceOf(DomainException);
  });

  it('reports the current version when the update predicate matches nothing', async () => {
    const repo = repository({
      update: jest.fn().mockResolvedValue(null),
    });
    (repo.byId as jest.Mock)
      .mockResolvedValueOnce(agent({ version: 5 }))
      .mockResolvedValueOnce(agent({ version: 7 }));
    const service = new AiAgentService(repo);
    // The caller is told 7, the value it must retry with — not its own stale 5.
    await expect(
      service.update(caller, 'agent-1', { expectedVersion: 5, enabled: true }),
    ).rejects.toMatchObject({ code: new VersionConflictException(7).code });
  });

  it('never forwards expectedVersion or knowledgeBaseIds as column updates', async () => {
    const repo = repository();
    const service = new AiAgentService(repo);
    await service.update(caller, 'agent-1', {
      expectedVersion: 1,
      enabled: true,
      knowledgeBaseIds: [],
    });
    const [, , data] = (repo.update as jest.Mock).mock.calls[0] as unknown[];
    expect(data).toEqual({ enabled: true, updatedBy: 'account-1' });
  });
});
