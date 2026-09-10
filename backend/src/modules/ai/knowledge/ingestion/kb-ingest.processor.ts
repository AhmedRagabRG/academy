import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { createHash } from 'node:crypto';
import { KB_INGEST_QUEUE } from '../../../../queue/queue.constants';
import {
  STORAGE_SERVICE,
  type StorageService,
} from '../../../../storage/storage.service.interface';
import { OpenAiClient } from '../../llm/openai.client';
import { KnowledgeRepository } from '../knowledge.repository';
import type { KbIngestJob } from '../knowledge.service';
import { chunk } from './chunker';
import { extractText } from './extractors';

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : 'تعذر فهرسة مصدر المعرفة';

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const buffers: Buffer[] = [];
  for await (const part of stream) {
    const value: unknown = part;
    if (Buffer.isBuffer(value)) buffers.push(value);
    else if (typeof value === 'string') buffers.push(Buffer.from(value));
    else if (value instanceof Uint8Array) buffers.push(Buffer.from(value));
    else throw new Error('تعذر قراءة ملف مصدر المعرفة');
  }
  return Buffer.concat(buffers);
}

@Processor(KB_INGEST_QUEUE)
export class KbIngestProcessor extends WorkerHost {
  private readonly logger = new Logger(KbIngestProcessor.name);

  constructor(
    private readonly repository: KnowledgeRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    private readonly openAi: OpenAiClient,
  ) {
    super();
  }

  async process(job: Job<KbIngestJob>): Promise<void> {
    const source = await this.repository.loadSourceForIngest(job.data.sourceId);
    if (!source) return;
    const claimed = await this.repository.markProcessing(source.id);
    if (claimed.count !== 1) return;

    try {
      let buffer: Buffer;
      let mimeType: string;
      if (source.kind === 'FILE') {
        if (!source.storageName) throw new Error('ملف مصدر المعرفة غير موجود');
        buffer = await streamToBuffer(
          await this.storage.retrieve(source.storageName),
        );
        mimeType = source.mimeType ?? 'application/octet-stream';
      } else if (source.kind === 'TEXT') {
        buffer = Buffer.from(source.rawText ?? '', 'utf8');
        mimeType = 'text/plain';
      } else {
        throw new Error('نوع مصدر المعرفة غير مدعوم للفهرسة');
      }
      const text = await extractText(buffer, mimeType);
      const checksum = createHash('sha256').update(text).digest('hex');

      if (source.activeRevision > 0 && source.checksum === checksum) {
        this.logger.log({ sourceId: source.id, message: 'checksum unchanged' });
        await this.repository.markUnchangedReady(source.id);
        return;
      }

      const chunks = chunk(text);
      const embeddings = await this.openAi.embed({
        texts: chunks.map((item) =>
          item.heading ? `${item.heading}\n\n${item.content}` : item.content,
        ),
      });
      if (
        embeddings.length !== chunks.length ||
        embeddings.some((embedding) => embedding.length !== 1536)
      )
        throw new Error('أعاد مزود التضمين نتيجة غير صالحة');

      // A replacement revision is inserted and made active atomically, then
      // the prior revision is removed in that same transaction. If extraction,
      // embedding, or any insert fails, the old activeRevision keeps serving;
      // readers can therefore never observe a partially written revision.
      await this.repository.commitRevision({
        source,
        checksum,
        chunks: chunks.map((item, index) => ({
          ...item,
          embedding: embeddings[index],
        })),
      });
    } catch (error) {
      await this.repository.markFailed(
        source.id,
        source.activeRevision,
        messageOf(error),
      );
      throw error;
    }
  }
}
