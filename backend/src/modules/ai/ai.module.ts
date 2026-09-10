import { DynamicModule, Module } from '@nestjs/common';
import { aiConfig, redisConfig } from '../../config/configuration';
import { QueueModule } from '../../queue/queue.module';
import { StorageModule } from '../../storage/storage.module';
import { InboxModule } from '../inbox/inbox.module';
import { KnowledgeController } from './knowledge/knowledge.controller';
import { KbIngestProcessor } from './knowledge/ingestion/kb-ingest.processor';
import { KnowledgeRepository } from './knowledge/knowledge.repository';
import { KnowledgeService } from './knowledge/knowledge.service';
import { OpenAiClient } from './llm/openai.client';
import { AiResumeSweeper } from './runtime/ai-resume.sweeper';

@Module({})
export class AiModule {
  static register(
    options = {
      queueEnabled: aiConfig().queueEnabled,
      redisUrl: redisConfig().url,
    },
  ): DynamicModule {
    const queueAvailable =
      options.queueEnabled && options.redisUrl.trim().length > 0;
    return {
      module: AiModule,
      imports: [InboxModule, StorageModule, QueueModule.register(options)],
      controllers: [KnowledgeController],
      providers: [
        OpenAiClient,
        AiResumeSweeper,
        KnowledgeRepository,
        KnowledgeService,
        ...(queueAvailable ? [KbIngestProcessor] : []),
      ],
      exports: [OpenAiClient, KnowledgeService, KnowledgeRepository],
    };
  }
}
