import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import type { Job } from 'bullmq';
import { PrismaClient } from '../../../prisma/generated/client';
import { KbIngestProcessor } from '../../../src/modules/ai/knowledge/ingestion/kb-ingest.processor';
import { KnowledgeRepository } from '../../../src/modules/ai/knowledge/knowledge.repository';
import type { KbIngestJob } from '../../../src/modules/ai/knowledge/knowledge.service';
import type { OpenAiClient } from '../../../src/modules/ai/llm/openai.client';
import type { StorageService } from '../../../src/storage/storage.service.interface';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const repository = new KnowledgeRepository(prisma as never);

const vector = (first: number, second: number): number[] =>
  Array.from({ length: 1536 }, (_, index) =>
    index === 0 ? first : index === 1 ? second : 0,
  );
const vectorFor = (text: string): number[] => {
  if (text.includes('distant') || text.includes('new-version'))
    return vector(0, 1);
  return vector(1, 0);
};
const openAi = {
  embed: jest.fn((input: { texts: string[] }) =>
    Promise.resolve(input.texts.map(vectorFor)),
  ),
} as unknown as OpenAiClient;
const processor = new KbIngestProcessor(
  repository,
  {} as StorageService,
  openAi,
);

let organizationId = '';
const baseIds: string[] = [];

const createBase = async (name: string) => {
  const row = await prisma.knowledgeBase.create({
    data: { organizationId, name: `${name}-${randomUUID()}` },
  });
  baseIds.push(row.id);
  return row.id;
};

const createTextSource = async (input: {
  knowledgeBaseId: string;
  title: string;
  rawText: string;
  visibility?: 'CUSTOMER_FACING' | 'INTERNAL';
}) => {
  const source = await prisma.knowledgeSource.create({
    data: {
      organizationId,
      knowledgeBaseId: input.knowledgeBaseId,
      kind: 'TEXT',
      title: input.title,
      rawText: input.rawText,
      mimeType: 'text/plain',
      visibility: input.visibility ?? 'CUSTOMER_FACING',
    },
  });
  await processor.process({
    data: { sourceId: source.id },
  } as Job<KbIngestJob>);
  return prisma.knowledgeSource.findUniqueOrThrow({ where: { id: source.id } });
};

beforeAll(async () => {
  organizationId = (await prisma.organization.findFirstOrThrow()).id;
});

afterAll(async () => {
  for (const id of baseIds)
    await prisma.knowledgeBase.delete({ where: { id } }).catch(() => undefined);
  await prisma.$disconnect();
});

describe('knowledge ingestion and retrieval', () => {
  it('ranks the closest chunk first with deterministic embeddings', async () => {
    const baseId = await createBase('ranking');
    const closest = await createTextSource({
      knowledgeBaseId: baseId,
      title: 'Closest',
      rawText: 'closest semantic material.',
    });
    await createTextSource({
      knowledgeBaseId: baseId,
      title: 'Distant',
      rawText: 'distant semantic material.',
    });
    const results = await repository.search({
      organizationId,
      knowledgeBaseIds: [baseId],
      embedding: vector(1, 0),
      topK: 10,
      minScore: -1,
    });
    expect(results[0]?.sourceId).toBe(closest.id);
  });

  it('never retrieves a chunk from a base outside knowledgeBaseIds', async () => {
    const allowedBaseId = await createBase('allowed');
    const excludedBaseId = await createBase('excluded');
    await createTextSource({
      knowledgeBaseId: allowedBaseId,
      title: 'Allowed',
      rawText: 'allowed content.',
    });
    const excluded = await createTextSource({
      knowledgeBaseId: excludedBaseId,
      title: 'Excluded',
      rawText: 'closest excluded content.',
    });
    const results = await repository.search({
      organizationId,
      knowledgeBaseIds: [allowedBaseId],
      embedding: vector(1, 0),
      topK: 10,
      minScore: -1,
    });
    expect(results.map((result) => result.sourceId)).not.toContain(excluded.id);
  });

  it('never retrieves INTERNAL or soft-deleted sources', async () => {
    const baseId = await createBase('visibility');
    const internal = await createTextSource({
      knowledgeBaseId: baseId,
      title: 'Internal',
      rawText: 'closest internal content.',
      visibility: 'INTERNAL',
    });
    const deleted = await createTextSource({
      knowledgeBaseId: baseId,
      title: 'Deleted',
      rawText: 'closest deleted content.',
    });
    await prisma.knowledgeSource.update({
      where: { id: deleted.id },
      data: { deletedAt: new Date() },
    });
    const results = await repository.search({
      organizationId,
      knowledgeBaseIds: [baseId],
      embedding: vector(1, 0),
      topK: 10,
      minScore: -1,
    });
    const sourceIds = results.map((result) => result.sourceId);
    expect(sourceIds).not.toContain(internal.id);
    expect(sourceIds).not.toContain(deleted.id);
  });

  it('bumps activeRevision without exposing a mixed revision', async () => {
    const baseId = await createBase('revision');
    const initial = await createTextSource({
      knowledgeBaseId: baseId,
      title: 'Versioned',
      rawText: 'old-version content.',
    });
    await prisma.knowledgeSource.update({
      where: { id: initial.id },
      data: { rawText: 'new-version content.', status: 'PENDING' },
    });
    await processor.process({
      data: { sourceId: initial.id },
    } as Job<KbIngestJob>);
    const current = await prisma.knowledgeSource.findUniqueOrThrow({
      where: { id: initial.id },
    });
    expect(current.activeRevision).toBe(2);

    const oldResults = await repository.search({
      organizationId,
      knowledgeBaseIds: [baseId],
      embedding: vector(1, 0),
      topK: 10,
      minScore: 0.99,
    });
    expect(oldResults).toHaveLength(0);
    const newResults = await repository.search({
      organizationId,
      knowledgeBaseIds: [baseId],
      embedding: vector(0, 1),
      topK: 10,
      minScore: 0.99,
    });
    expect(newResults).toHaveLength(1);
    expect(newResults[0]?.content).toContain('new-version');

    const revisions = await prisma.$queryRaw<Array<{ revision: number }>>`
      SELECT DISTINCT revision
      FROM "KnowledgeChunk"
      WHERE "sourceId" = ${initial.id}::uuid
    `;
    expect(revisions).toEqual([{ revision: 2 }]);
  });
});

/**
 * The HNSW index lives only in migration SQL, because Prisma cannot express
 * `USING hnsw (embedding vector_cosine_ops)`. That makes it invisible to the
 * schema and a standing target for `prisma migrate dev`, which reads it as
 * drift and proposes dropping it — which has already happened once.
 *
 * Losing it is silent: every assertion above still passes, because a sequential
 * scan returns the same rows in the same order. Only the query plan changes.
 * So this asserts the index itself rather than any behaviour it produces.
 */
describe('vector index', () => {
  it('keeps the HNSW index on KnowledgeChunk.embedding', async () => {
    const rows = await prisma.$queryRaw<Array<{ indexdef: string }>>`
      SELECT indexdef FROM pg_indexes
      WHERE tablename = 'KnowledgeChunk'
        AND indexname = 'knowledge_chunk_embedding_idx'
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.indexdef).toContain('hnsw');
    expect(rows[0]?.indexdef).toContain('vector_cosine_ops');
  });
});
