import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';

const agentInclude = {
  knowledgeBases: { select: { knowledgeBaseId: true } },
  ticketRoutingRules: {
    orderBy: { displayOrder: 'asc' },
  },
} satisfies Prisma.AiAgentInclude;
export type AiAgentAggregate = Prisma.AiAgentGetPayload<{
  include: typeof agentInclude;
}>;

@Injectable()
export class AiAgentRepository {
  constructor(readonly db: PrismaService) {}
  async organizationId() {
    return (
      await this.db.organization.findFirstOrThrow({ select: { id: true } })
    ).id;
  }
  async list() {
    return this.db.aiAgent.findMany({
      where: { organizationId: await this.organizationId() },
      include: agentInclude,
      orderBy: { name: 'asc' },
    });
  }
  async byId(id: string) {
    return this.db.aiAgent.findFirst({
      where: { id, organizationId: await this.organizationId() },
      include: agentInclude,
    });
  }
  /** Platform codes that actually exist for this organization. */
  async platformCodes(organizationId: string) {
    return (
      await this.db.inboxPlatform.findMany({
        where: { organizationId },
        select: { code: true },
      })
    ).map((platform) => platform.code);
  }
  async knowledgeBaseIds(organizationId: string, ids: string[]) {
    return (
      await this.db.knowledgeBase.findMany({
        where: { id: { in: ids }, organizationId },
        select: { id: true },
      })
    ).map((base) => base.id);
  }
  /**
   * The version guard lives in the UPDATE predicate, not in a preceding read, so
   * two concurrent saves cannot both observe the same version and both win.
   * `knowledgeBaseIds` is replaced wholesale in the same transaction: a partial
   * rebind would leave the agent retrieving from a set no admin chose.
   */
  async update(
    id: string,
    expectedVersion: number,
    data: Prisma.AiAgentUpdateInput,
    knowledgeBaseIds: string[] | undefined,
    organizationId: string,
  ): Promise<AiAgentAggregate | null> {
    return this.db.$transaction(async (tx) => {
      const result = await tx.aiAgent.updateMany({
        where: { id, organizationId, version: expectedVersion },
        data: { ...data, version: { increment: 1 } },
      });
      if (result.count !== 1) return null;
      if (knowledgeBaseIds) {
        await tx.aiAgentKnowledgeBase.deleteMany({ where: { agentId: id } });
        if (knowledgeBaseIds.length)
          await tx.aiAgentKnowledgeBase.createMany({
            data: knowledgeBaseIds.map((knowledgeBaseId) => ({
              organizationId,
              agentId: id,
              knowledgeBaseId,
            })),
          });
      }
      return tx.aiAgent.findFirstOrThrow({
        where: { id },
        include: agentInclude,
      });
    });
  }
}
