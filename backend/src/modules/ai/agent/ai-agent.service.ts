import { Injectable } from '@nestjs/common';
import {
  DomainException,
  NotFoundException,
  VersionConflictException,
} from '../../../core/exceptions';
import type { CallerContext } from '../../../shared/types/caller-context';
import type { UpdateAiAgentDto } from './dto/ai-agent.dto';
import {
  AiAgentRepository,
  type AiAgentAggregate,
} from './ai-agent.repository';

@Injectable()
export class AiAgentService {
  constructor(private readonly repository: AiAgentRepository) {}

  private project(agent: AiAgentAggregate) {
    return {
      id: agent.id,
      organizationId: agent.organizationId,
      name: agent.name,
      enabled: agent.enabled,
      systemInstructions: agent.systemInstructions,
      tone: agent.tone,
      responseLanguage: agent.responseLanguage,
      maxResponseChars: agent.maxResponseChars,
      enabledPlatformCodes: agent.enabledPlatformCodes,
      resumeAfterMinutes: agent.resumeAfterMinutes,
      fallbackMessage: agent.fallbackMessage,
      handoffMessage: agent.handoffMessage,
      knowledgeBaseIds: agent.knowledgeBases.map((row) => row.knowledgeBaseId),
      version: agent.version,
      updatedAt: agent.updatedAt.toISOString(),
    };
  }

  async list() {
    return (await this.repository.list()).map((agent) => this.project(agent));
  }

  async byId(id: string) {
    const agent = await this.repository.byId(id);
    if (!agent) throw new NotFoundException();
    return this.project(agent);
  }

  async update(caller: CallerContext, id: string, dto: UpdateAiAgentDto) {
    const organizationId = await this.repository.organizationId();
    const current = await this.repository.byId(id);
    if (!current) throw new NotFoundException();

    if (dto.enabledPlatformCodes) {
      const known = await this.repository.platformCodes(organizationId);
      const unknown = dto.enabledPlatformCodes.filter(
        (code) => !known.includes(code),
      );
      if (unknown.length)
        throw new DomainException(
          'platform-unknown',
          `قناة غير معروفة: ${unknown.join('، ')}`,
          422,
        );
    }
    if (dto.knowledgeBaseIds?.length) {
      const found = await this.repository.knowledgeBaseIds(
        organizationId,
        dto.knowledgeBaseIds,
      );
      if (found.length !== dto.knowledgeBaseIds.length)
        throw new DomainException(
          'knowledge-base-unknown',
          'إحدى قواعد المعرفة غير موجودة',
          422,
        );
    }

    const { expectedVersion, knowledgeBaseIds, ...fields } = dto;
    const updated = await this.repository.update(
      id,
      expectedVersion,
      { ...fields, updatedBy: caller.accountId },
      knowledgeBaseIds,
      organizationId,
    );
    // A null result means the version predicate matched nothing. Re-read rather
    // than echoing the caller's stale number, so the client is told the value it
    // must retry with.
    if (!updated) {
      const latest = await this.repository.byId(id);
      throw new VersionConflictException(latest?.version ?? expectedVersion);
    }
    return this.project(updated);
  }
}
