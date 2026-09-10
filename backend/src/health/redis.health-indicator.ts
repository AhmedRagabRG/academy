import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicator, type HealthIndicatorResult } from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator
  extends HealthIndicator
  implements OnModuleDestroy
{
  private readonly client?: Redis;
  constructor(config: ConfigService) {
    super();
    const enabled = config.get<boolean>('ai.queueEnabled') === true;
    const url = config.get<string>('redis.url') ?? '';
    if (!enabled || !url) return;
    this.client = new Redis(url, {
      lazyConnect: true,
      connectTimeout: 1000,
      commandTimeout: 1000,
      maxRetriesPerRequest: 1,
    });
    this.client.on('error', () => undefined);
  }
  onModuleDestroy(): void {
    this.client?.disconnect();
  }
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    if (!this.client) return this.getStatus(key, true, { disabled: true });
    try {
      await Promise.race([
        this.client.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 1000),
        ),
      ]);
      return this.getStatus(key, true);
    } catch {
      return this.getStatus(key, false, {
        message: 'فشل الاتصال بخدمة Redis',
      });
    }
  }
}
