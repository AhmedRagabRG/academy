import { Controller, Get } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from '../core/decorators/public.decorator';
import {
  ApiEnvelopeResponse,
  ApiErrorResponses,
} from '../shared/swagger/api-envelope.decorator';
import { PrismaHealthIndicator } from './prisma.health-indicator';
import { RedisHealthIndicator } from './redis.health-indicator';
class HealthDto {
  @ApiProperty() status!: string;
}
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: PrismaHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}
  @Get()
  @Public()
  @HealthCheck()
  @ApiEnvelopeResponse(HealthDto)
  @ApiErrorResponses('INTERNAL_ERROR')
  check() {
    return this.health.check([
      () => Promise.resolve({ api: { status: 'up' } }),
      () => this.database.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
    ]);
  }
}
