import { Injectable } from '@nestjs/common';
import { HealthIndicator, type HealthIndicatorResult } from '@nestjs/terminus';
import { DatabaseHealthService } from '../database/database-health.service';
@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly database: DatabaseHealthService) {
    super();
  }
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await Promise.race([
        this.database.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 1000),
        ),
      ]);
      return this.getStatus(key, true);
    } catch {
      return this.getStatus(key, false, {
        message: 'فشل الاتصال بقاعدة البيانات',
      });
    }
  }
}
