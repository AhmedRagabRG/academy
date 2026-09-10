import { Injectable } from '@nestjs/common';
import {
  AGENT_TOOL_NAMES,
  WRITABLE_CONTACT_FIELDS,
} from '../tools/tool.contract';
import { Prisma } from '../../../../prisma/generated/client';
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
      workingHours: agent.workingHours as Record<string, string> | null,
      outsideHoursBehaviour: agent.outsideHoursBehaviour,
      allowedTools: agent.allowedTools,
      allowedCrmFields: agent.allowedCrmFields,
      dataCollectionFields: agent.dataCollectionFields,
      routingRules: agent.ticketRoutingRules.map((rule) => ({
        category: rule.category,
        categoryLabel: rule.categoryLabel,
        teamId: rule.teamId,
        priority: rule.priority,
        active: rule.active,
        displayOrder: rule.displayOrder,
      })),
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
    // The DTO already rejects these at the HTTP boundary. Repeating the check
    // here keeps the guarantee for any non-HTTP caller (a seed, a script, a
    // future internal service) and makes it consistent with the platform and
    // knowledge-base checks below. Nothing invalid can reach a write either
    // way — the tools intersect against a hard-coded ceiling — but storing a
    // value that silently does nothing would let an admin believe a capability
    // is on when it is not.
    if (dto.allowedTools) {
      const unknown = dto.allowedTools.filter(
        (tool) => !(AGENT_TOOL_NAMES as readonly string[]).includes(tool),
      );
      if (unknown.length)
        throw new DomainException(
          'tool-unknown',
          `أداة غير معروفة: ${unknown.join('، ')}`,
          422,
        );
    }
    if (dto.allowedCrmFields) {
      const unknown = dto.allowedCrmFields.filter(
        (field) =>
          !(WRITABLE_CONTACT_FIELDS as readonly string[]).includes(field),
      );
      if (unknown.length)
        throw new DomainException(
          'crm-field-unknown',
          `حقل غير قابل للتعديل: ${unknown.join('، ')}`,
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

    const {
      expectedVersion,
      knowledgeBaseIds,
      dataCollectionFields,
      workingHours,
      ...fields
    } = dto;
    const updated = await this.repository.update(
      id,
      expectedVersion,
      {
        ...fields,
        // Validated by the DTO to [{key, label, ...}] or absent.
        ...(dataCollectionFields !== undefined
          ? {
              dataCollectionFields:
                dataCollectionFields as Prisma.InputJsonValue,
            }
          : {}),
        // null means 24/7 and must become the Json-null input, not a literal.
        ...(workingHours !== undefined
          ? {
              workingHours:
                workingHours === null ? Prisma.DbNull : workingHours,
            }
          : {}),
        updatedBy: caller.accountId,
      },
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
