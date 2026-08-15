import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import { ApiOrganizationRead } from '../../../shared/swagger/organization-api.decorator';
import { BatchService } from './batch.service';
import { BatchEligibilityQueryDto } from './dto/batch-consumer.dto';
import {
  BatchEligibilityResponseDto,
  ProgramBatchResponseDto,
} from './dto/batch-response.dto';
import { BatchIdDto } from './dto/upsert-batch.dto';

@ApiTags('Program Batches - Consumers')
@Controller('batches')
export class BatchConsumerController {
  constructor(private readonly batches: BatchService) {}

  @Get(':batchId/eligibility')
  @RequirePermissions('batches.view')
  @ApiOrganizationRead('أهلية الدفعة للقبول', BatchEligibilityResponseDto)
  eligibility(
    @CurrentCaller() caller: CallerContext,
    @Param() params: BatchIdDto,
    @Query() query: BatchEligibilityQueryDto,
  ) {
    return this.batches.eligibility(
      params.batchId,
      query.branchId,
      query.today,
      caller,
    );
  }

  @Get(':batchId/lifecycle')
  @RequirePermissions('batches.view')
  @ApiOrganizationRead('سجل دورة حياة الدفعة', ProgramBatchResponseDto)
  lifecycle(
    @CurrentCaller() caller: CallerContext,
    @Param() params: BatchIdDto,
  ) {
    return this.batches.lifecycle(params.batchId, caller);
  }

  @Get(':batchId/financial-revisions')
  @RequirePermissions('batches.view')
  @ApiOrganizationRead('المراجعات المالية للدفعة', ProgramBatchResponseDto)
  revisions(
    @CurrentCaller() caller: CallerContext,
    @Param() params: BatchIdDto,
  ) {
    return this.batches.revisions(params.batchId, caller);
  }
}
