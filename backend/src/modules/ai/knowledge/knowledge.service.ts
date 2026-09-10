import { Inject, Injectable, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  EntityStatus,
  KnowledgeSourceKind,
  KnowledgeVisibility,
  type KnowledgeBase,
  type KnowledgeSource,
} from '../../../../prisma/generated/client';
import {
  DomainException,
  NotFoundException,
  VersionConflictException,
} from '../../../core/exceptions';
import { KB_INGEST_QUEUE } from '../../../queue/queue.constants';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  STORAGE_SERVICE,
  type StorageService,
  type UploadedFile,
} from '../../../storage/storage.service.interface';
import { OpenAiClient } from '../llm/openai.client';
import type {
  CreateKnowledgeBaseDto,
  CreateKnowledgeSourceDto,
  UpdateKnowledgeBaseDto,
} from './dto/knowledge.dto';
import { KnowledgeRepository } from './knowledge.repository';

export interface KbIngestJob {
  sourceId: string;
}

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly repository: KnowledgeRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    private readonly openAi: OpenAiClient,
    @Optional()
    @InjectQueue(KB_INGEST_QUEUE)
    private readonly ingestQueue?: Queue<KbIngestJob>,
  ) {}

  private projectBase(base: KnowledgeBase & { _count?: { sources: number } }) {
    return {
      id: base.id,
      organizationId: base.organizationId,
      name: base.name,
      description: base.description,
      status: base.status.toLowerCase(),
      version: base.version,
      ...(base._count ? { sourceCount: base._count.sources } : {}),
      createdAt: base.createdAt.toISOString(),
      updatedAt: base.updatedAt.toISOString(),
    };
  }

  private projectSource(source: KnowledgeSource) {
    return {
      id: source.id,
      knowledgeBaseId: source.knowledgeBaseId,
      kind: source.kind.toLowerCase(),
      title: source.title,
      visibility: source.visibility.toLowerCase().replace('_', '-'),
      status: source.status.toLowerCase(),
      failureReason: source.failureReason,
      activeRevision: source.activeRevision,
      chunkCount: source.chunkCount,
      tokenCount: source.tokenCount,
      mimeType: source.mimeType,
      sizeBytes: source.sizeBytes,
      version: source.version,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
    };
  }

  private async organizationId() {
    return this.repository.organizationId();
  }

  private async baseOrThrow(organizationId: string, id: string) {
    const base = await this.repository.findBase(organizationId, id);
    if (!base) throw new NotFoundException();
    return base;
  }

  private async sourceOrThrow(organizationId: string, sourceId: string) {
    const source = await this.repository.findSource(organizationId, sourceId);
    if (!source) throw new NotFoundException();
    return source;
  }

  private async enqueue(sourceId: string): Promise<void> {
    if (!this.ingestQueue) return;
    await this.ingestQueue.add('ingest', { sourceId });
  }

  async list() {
    const organizationId = await this.organizationId();
    return (await this.repository.listBases(organizationId)).map((base) =>
      this.projectBase(base),
    );
  }

  async create(caller: CallerContext, dto: CreateKnowledgeBaseDto) {
    const organizationId = await this.organizationId();
    return this.projectBase(
      await this.repository.createBase({
        organizationId,
        name: dto.name,
        description: dto.description || null,
        createdBy: caller.accountId,
        updatedBy: caller.accountId,
      }),
    );
  }

  async update(caller: CallerContext, id: string, dto: UpdateKnowledgeBaseDto) {
    const organizationId = await this.organizationId();
    await this.baseOrThrow(organizationId, id);
    const result = await this.repository.updateBase(
      organizationId,
      id,
      dto.expectedVersion,
      {
        ...(dto.name === undefined ? {} : { name: dto.name }),
        ...(dto.description === undefined
          ? {}
          : { description: dto.description || null }),
        ...(dto.status === undefined
          ? {}
          : {
              status:
                dto.status === 'active'
                  ? EntityStatus.ACTIVE
                  : EntityStatus.INACTIVE,
            }),
        updatedBy: caller.accountId,
      },
    );
    if (result.count !== 1) {
      const current = await this.baseOrThrow(organizationId, id);
      throw new VersionConflictException(current.version);
    }
    return this.projectBase(await this.baseOrThrow(organizationId, id));
  }

  async remove(caller: CallerContext, id: string, expectedVersion: number) {
    const organizationId = await this.organizationId();
    await this.baseOrThrow(organizationId, id);
    const result = await this.repository.archiveBase(
      organizationId,
      id,
      expectedVersion,
      caller.accountId,
    );
    if (result.count !== 1) {
      const current = await this.baseOrThrow(organizationId, id);
      throw new VersionConflictException(current.version);
    }
  }

  async sources(knowledgeBaseId: string) {
    const organizationId = await this.organizationId();
    await this.baseOrThrow(organizationId, knowledgeBaseId);
    return (
      await this.repository.listSources(organizationId, knowledgeBaseId)
    ).map((source) => this.projectSource(source));
  }

  async createSource(
    caller: CallerContext,
    knowledgeBaseId: string,
    dto: CreateKnowledgeSourceDto,
    file?: UploadedFile,
  ) {
    const organizationId = await this.organizationId();
    await this.baseOrThrow(organizationId, knowledgeBaseId);
    const isFile = Boolean(file);
    if (isFile && (dto.kind === 'text' || dto.rawText !== undefined))
      throw new DomainException(
        'knowledge-source-input-invalid',
        'اختر ملفًا أو نصًا، وليس كليهما',
        422,
      );
    if (!isFile && (dto.kind !== 'text' || !dto.title || !dto.rawText))
      throw new DomainException(
        'knowledge-source-input-invalid',
        'عنوان مصدر المعرفة ونصه مطلوبان',
        422,
      );

    const stored = file
      ? await this.storage.store(file, 'knowledge-source')
      : undefined;
    const source = await this.repository.createSource({
      organizationId,
      knowledgeBaseId,
      kind: stored ? KnowledgeSourceKind.FILE : KnowledgeSourceKind.TEXT,
      title: dto.title || stored?.originalName || 'مصدر معرفة',
      visibility:
        dto.visibility === 'internal'
          ? KnowledgeVisibility.INTERNAL
          : KnowledgeVisibility.CUSTOMER_FACING,
      rawText: stored ? null : dto.rawText,
      storageId: stored?.id,
      storageName: stored?.fileName,
      mimeType: stored?.mimeType ?? 'text/plain',
      sizeBytes: stored?.size ?? Buffer.byteLength(dto.rawText ?? '', 'utf8'),
      createdBy: caller.accountId,
      updatedBy: caller.accountId,
    });
    await this.enqueue(source.id);
    return this.projectSource(source);
  }

  async deleteSource(caller: CallerContext, sourceId: string) {
    const organizationId = await this.organizationId();
    await this.sourceOrThrow(organizationId, sourceId);
    const result = await this.repository.softDeleteSource(
      organizationId,
      sourceId,
      caller.accountId,
    );
    if (result.count !== 1) throw new NotFoundException();
  }

  async reindex(caller: CallerContext, sourceId: string) {
    const organizationId = await this.organizationId();
    await this.sourceOrThrow(organizationId, sourceId);
    const result = await this.repository.queueReindex(
      organizationId,
      sourceId,
      caller.accountId,
    );
    if (result.count !== 1) throw new NotFoundException();
    await this.enqueue(sourceId);
    return this.projectSource(
      await this.sourceOrThrow(organizationId, sourceId),
    );
  }

  async search(input: {
    organizationId: string;
    knowledgeBaseIds: string[];
    query: string;
    topK: number;
    minScore: number;
  }) {
    const { query, ...searchBoundary } = input;
    const [embedding] = await this.openAi.embed({ texts: [query] });
    if (!embedding) return [];
    return this.repository.search({ ...searchBoundary, embedding });
  }
}
