import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { CatalogModule } from '../catalog/catalog.module';
import { OrganizationModule } from '../organization/organization.module';
import { BatchConsumerController } from './batches/batch-consumer.controller';
import { BatchController } from './batches/batch.controller';
import { BatchPolicy } from './batches/batch.policy';
import { BatchPublicService } from './batches/batch-public.service';
import { BatchRepository } from './batches/batch.repository';
import { BatchService } from './batches/batch.service';
import { BatchCapacityService } from './capacity/batch-capacity.service';
import { BatchFinancialPolicy } from './financial/batch-financial.policy';
import { BatchLookupsService } from './lookups/batch-lookups.service';
import {
  BATCH_ENROLLMENT_DEPENDENCY_PORT,
  EmptyBatchEnrollmentDependency,
} from './types/batch-reference.port';
import { PROGRAM_BATCHES_PUBLIC_PORT } from './types/program-batches-public.port';

@Module({
  imports: [CoreModule, CatalogModule, OrganizationModule],
  controllers: [BatchController, BatchConsumerController],
  providers: [
    BatchRepository,
    BatchPolicy,
    BatchFinancialPolicy,
    BatchCapacityService,
    BatchLookupsService,
    BatchService,
    BatchPublicService,
    EmptyBatchEnrollmentDependency,
    {
      provide: BATCH_ENROLLMENT_DEPENDENCY_PORT,
      useExisting: EmptyBatchEnrollmentDependency,
    },
    {
      provide: PROGRAM_BATCHES_PUBLIC_PORT,
      useExisting: BatchPublicService,
    },
  ],
  exports: [PROGRAM_BATCHES_PUBLIC_PORT],
})
export class ProgramBatchesModule {}
