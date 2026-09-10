import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Logger, Module } from '@nestjs/common';
import { aiConfig, redisConfig } from '../config/configuration';
import { AI_TURN_QUEUE, KB_INGEST_QUEUE } from './queue.constants';

export interface QueueRegistrationOptions {
  queueEnabled: boolean;
  redisUrl: string;
}

@Module({})
export class QueueModule {
  static register(
    options: QueueRegistrationOptions = {
      queueEnabled: aiConfig().queueEnabled,
      redisUrl: redisConfig().url,
    },
  ): DynamicModule {
    if (!options.queueEnabled || !options.redisUrl) {
      new Logger(QueueModule.name).log(
        !options.queueEnabled
          ? 'AI queue disabled by configuration'
          : 'AI queue disabled because Redis is not configured',
      );
      return { module: QueueModule, imports: [], exports: [] };
    }
    const root = BullModule.forRoot({
      connection: { url: options.redisUrl },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
    const queues = BullModule.registerQueue(
      { name: AI_TURN_QUEUE },
      { name: KB_INGEST_QUEUE },
    );
    return {
      module: QueueModule,
      imports: [root, queues],
      exports: [BullModule],
    };
  }
}
