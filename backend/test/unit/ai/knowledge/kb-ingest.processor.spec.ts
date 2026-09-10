jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(),
  APIConnectionError: class APIConnectionError extends Error {},
}));

import type { KnowledgeSource } from '../../../../prisma/generated/client';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import type { PrismaService } from '../../../../src/database/prisma.service';
import { KbIngestProcessor } from '../../../../src/modules/ai/knowledge/ingestion/kb-ingest.processor';
import { KnowledgeRepository } from '../../../../src/modules/ai/knowledge/knowledge.repository';
import type { OpenAiClient } from '../../../../src/modules/ai/llm/openai.client';
import type { StorageService } from '../../../../src/storage/storage.service.interface';

const source = (overrides: Partial<KnowledgeSource> = {}): KnowledgeSource => ({
  id: '10000000-0000-4000-8000-000000000001',
  organizationId: '10000000-0000-4000-8000-000000000002',
  knowledgeBaseId: '10000000-0000-4000-8000-000000000003',
  kind: 'TEXT',
  title: 'Test source',
  visibility: 'CUSTOMER_FACING',
  rawText: 'A useful sentence.',
  storageId: null,
  storageName: null,
  mimeType: 'text/plain',
  sizeBytes: 18,
  status: 'PENDING',
  failureReason: null,
  activeRevision: 0,
  chunkCount: 0,
  tokenCount: 0,
  checksum: null,
  deletedAt: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: null,
  updatedBy: null,
  ...overrides,
});

const setup = (row: KnowledgeSource) => {
  const updates: Array<Record<string, unknown>> = [];
  const executeRaw = jest.fn(() => Promise.resolve(1));
  const updateMany = jest.fn((args: { data: Record<string, unknown> }) => {
    updates.push(args.data);
    return Promise.resolve({ count: 1 });
  });
  const transaction = jest.fn(
    async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        $executeRaw: executeRaw,
        knowledgeSource: { updateMany },
      }),
  );
  const prisma = {
    knowledgeSource: {
      findFirst: jest.fn(() => Promise.resolve(row)),
      updateMany,
    },
    $transaction: transaction,
  } as unknown as PrismaService;
  const embed = jest.fn(() =>
    Promise.resolve([
      Array.from({ length: 1536 }, (_, index) => (index === 0 ? 1 : 0)),
    ]),
  );
  const openAi = { embed } as unknown as OpenAiClient;
  const repository = new KnowledgeRepository(prisma);
  const processor = new KbIngestProcessor(
    repository,
    {} as StorageService,
    openAi,
  );
  return {
    processor,
    repository,
    updates,
    executeRaw,
    transaction,
    openAi,
    embed,
  };
};

describe('KB ingestion processor', () => {
  it('commits a READY revision with chunk and token counts', async () => {
    const harness = setup(source());
    await harness.processor.process({
      data: { sourceId: source().id },
    } as never);
    const ready = harness.updates.find((update) => update.status === 'READY');
    expect(ready).toMatchObject({ activeRevision: 1, chunkCount: 1 });
    expect(ready?.tokenCount).toBeGreaterThan(0);
    expect(harness.executeRaw).toHaveBeenCalledTimes(1);
  });

  it('marks extraction failures FAILED without changing activeRevision', async () => {
    const row = source({
      kind: 'FILE',
      activeRevision: 4,
      mimeType: 'image/png',
      storageName: 'bad.png',
    });
    const harness = setup(row);
    const storage = {
      retrieve: jest.fn(() =>
        Promise.resolve(Readable.from(Buffer.from('bad'))),
      ),
    } as unknown as StorageService;
    const processor = new KbIngestProcessor(
      harness.repository,
      storage,
      harness.openAi,
    );
    await expect(
      processor.process({ data: { sourceId: row.id } } as never),
    ).rejects.toBeInstanceOf(Error);
    const failed = harness.updates.find((update) => update.status === 'FAILED');
    expect(failed).toBeDefined();
    expect(failed).not.toHaveProperty('activeRevision');
    expect(harness.transaction).not.toHaveBeenCalled();
  });

  it('skips embedding when the active revision checksum is unchanged', async () => {
    const checksum = createHash('sha256')
      .update('A useful sentence.')
      .digest('hex');
    const harness = setup(source({ activeRevision: 2, checksum }));
    await harness.processor.process({
      data: { sourceId: source().id },
    } as never);
    expect(harness.embed).not.toHaveBeenCalled();
    expect(harness.transaction).not.toHaveBeenCalled();
    expect(harness.updates).toContainEqual(
      expect.objectContaining({ status: 'READY', failureReason: null }),
    );
  });
});
