import { Global, Module } from '@nestjs/common';
import { PrismaErrorMapper } from './prisma-error.mapper';
import { PrismaService } from './prisma.service';
import { TransactionManager } from './transaction.manager';
import { DatabaseHealthService } from './database-health.service';
@Global()
@Module({
  providers: [
    PrismaService,
    TransactionManager,
    PrismaErrorMapper,
    DatabaseHealthService,
  ],
  exports: [
    PrismaService,
    TransactionManager,
    PrismaErrorMapper,
    DatabaseHealthService,
  ],
})
export class DatabaseModule {}
