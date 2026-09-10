import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  EntityStatus,
  KnowledgeSourceStatus,
  KnowledgeVisibility,
  Prisma,
  type KnowledgeSource,
} from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';
import type { Chunk } from './ingestion/chunker';

export interface KnowledgeSearchResult {
  id: string;
  sourceId: string;
  sourceTitle: string;
  heading: string | null;
  content: string;
  score: number;
}

export interface RevisionChunk extends Chunk {
  embedding: number[];
}

@Injectable()
export class KnowledgeRepository {
  constructor(readonly db: PrismaService) {}

  async organizationId(): Promise<string> {
    return (
      await this.db.organization.findFirstOrThrow({ select: { id: true } })
    ).id;
  }

  listBases(organizationId: string) {
    return this.db.knowledgeBase.findMany({
      where: { organizationId, status: { not: EntityStatus.ARCHIVED } },
      include: {
        _count: { select: { sources: { where: { deletedAt: null } } } },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  findBase(organizationId: string, id: string) {
    return this.db.knowledgeBase.findFirst({
      where: { id, organizationId, status: { not: EntityStatus.ARCHIVED } },
    });
  }

  createBase(data: Prisma.KnowledgeBaseUncheckedCreateInput) {
    return this.db.knowledgeBase.create({ data });
  }

  updateBase(
    organizationId: string,
    id: string,
    expectedVersion: number,
    data: Prisma.KnowledgeBaseUncheckedUpdateManyInput,
  ) {
    return this.db.knowledgeBase.updateMany({
      where: {
        id,
        organizationId,
        version: expectedVersion,
        status: { not: EntityStatus.ARCHIVED },
      },
      data: { ...data, version: { increment: 1 } },
    });
  }

  archiveBase(
    organizationId: string,
    id: string,
    expectedVersion: number,
    accountId: string,
  ) {
    return this.updateBase(organizationId, id, expectedVersion, {
      status: EntityStatus.ARCHIVED,
      updatedBy: accountId,
    });
  }

  listSources(organizationId: string, knowledgeBaseId: string) {
    return this.db.knowledgeSource.findMany({
      where: { organizationId, knowledgeBaseId, deletedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  createSource(data: Prisma.KnowledgeSourceUncheckedCreateInput) {
    return this.db.knowledgeSource.create({ data });
  }

  findSource(organizationId: string, sourceId: string) {
    return this.db.knowledgeSource.findFirst({
      where: { id: sourceId, organizationId, deletedAt: null },
    });
  }

  softDeleteSource(
    organizationId: string,
    sourceId: string,
    accountId: string,
  ) {
    return this.db.knowledgeSource.updateMany({
      where: { id: sourceId, organizationId, deletedAt: null },
      data: {
        deletedAt: new Date(),
        updatedBy: accountId,
        version: { increment: 1 },
      },
    });
  }

  queueReindex(organizationId: string, sourceId: string, accountId: string) {
    return this.db.knowledgeSource.updateMany({
      where: { id: sourceId, organizationId, deletedAt: null },
      data: {
        status: KnowledgeSourceStatus.PENDING,
        failureReason: null,
        updatedBy: accountId,
        version: { increment: 1 },
      },
    });
  }

  loadSourceForIngest(sourceId: string) {
    return this.db.knowledgeSource.findFirst({
      where: { id: sourceId, deletedAt: null },
    });
  }

  markProcessing(sourceId: string) {
    return this.db.knowledgeSource.updateMany({
      where: { id: sourceId, deletedAt: null },
      data: {
        status: KnowledgeSourceStatus.PROCESSING,
        failureReason: null,
      },
    });
  }

  markFailed(sourceId: string, activeRevision: number, failureReason: string) {
    return this.db.knowledgeSource.updateMany({
      where: { id: sourceId, activeRevision, deletedAt: null },
      data: { status: KnowledgeSourceStatus.FAILED, failureReason },
    });
  }

  markUnchangedReady(sourceId: string) {
    return this.db.knowledgeSource.updateMany({
      where: { id: sourceId, deletedAt: null },
      data: { status: KnowledgeSourceStatus.READY, failureReason: null },
    });
  }

  async commitRevision(input: {
    source: KnowledgeSource;
    checksum: string;
    chunks: RevisionChunk[];
  }): Promise<void> {
    const revision = input.source.activeRevision + 1;
    await this.db.$transaction(async (tx) => {
      for (const item of input.chunks) {
        const vector = JSON.stringify(item.embedding);
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "KnowledgeChunk" (
            "id", "organizationId", "knowledgeBaseId", "sourceId",
            "revision", "ordinal", "heading", "content", "tokenCount", "embedding"
          ) VALUES (
            ${randomUUID()}::uuid, ${input.source.organizationId}::uuid,
            ${input.source.knowledgeBaseId}::uuid, ${input.source.id}::uuid,
            ${revision}, ${item.ordinal}, ${item.heading}, ${item.content},
            ${item.tokenCount}, ${vector}::vector
          )
        `);
      }

      const updated = await tx.knowledgeSource.updateMany({
        where: {
          id: input.source.id,
          deletedAt: null,
          activeRevision: input.source.activeRevision,
        },
        data: {
          activeRevision: revision,
          status: KnowledgeSourceStatus.READY,
          failureReason: null,
          checksum: input.checksum,
          chunkCount: input.chunks.length,
          tokenCount: input.chunks.reduce(
            (total, item) => total + item.tokenCount,
            0,
          ),
        },
      });
      if (updated.count !== 1)
        throw new Error('Knowledge source changed while it was being indexed');

      if (input.source.activeRevision > 0) {
        await tx.$executeRaw(Prisma.sql`
          DELETE FROM "KnowledgeChunk"
          WHERE "sourceId" = ${input.source.id}::uuid
            AND "revision" = ${input.source.activeRevision}
        `);
      }
    });
  }

  async search(input: {
    organizationId: string;
    knowledgeBaseIds: string[];
    embedding: number[];
    topK: number;
    minScore: number;
  }): Promise<KnowledgeSearchResult[]> {
    if (!input.knowledgeBaseIds.length || input.topK <= 0) return [];
    if (input.embedding.length !== 1536)
      throw new Error('Knowledge search embedding must contain 1536 values');
    const vector = JSON.stringify(input.embedding);
    // This predicate is the tenant and visibility boundary: organization,
    // selected bases, and the fixed CUSTOMER_FACING value are trusted server
    // parameters. No model-generated value can widen any of those constraints.
    const rows = await this.db.$queryRaw<KnowledgeSearchResult[]>(Prisma.sql`
      SELECT c.id, c."sourceId", s.title AS "sourceTitle", c.heading, c.content,
             1 - (c.embedding <=> ${vector}::vector) AS score
      FROM "KnowledgeChunk" c
      JOIN "KnowledgeSource" s ON s.id = c."sourceId"
      WHERE c."organizationId" = ${input.organizationId}::uuid
        AND c."knowledgeBaseId" = ANY(${input.knowledgeBaseIds}::uuid[])
        AND c.revision = s."activeRevision"
        AND s."deletedAt" IS NULL
        AND s.visibility = ${KnowledgeVisibility.CUSTOMER_FACING}::"KnowledgeVisibility"
      ORDER BY c.embedding <=> ${vector}::vector
      LIMIT ${input.topK}
    `);
    return rows.filter((row) => Number(row.score) >= input.minScore);
  }
}
