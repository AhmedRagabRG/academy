import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  ApiOrganizationCreate,
  ApiOrganizationList,
  ApiOrganizationMutation,
  ApiOrganizationRead,
} from '../../../shared/swagger/organization-api.decorator';
import { BatchLookupsService } from '../lookups/batch-lookups.service';
import { BatchService } from './batch.service';
import { ChangeBatchStatusDto } from './dto/batch-lifecycle.dto';
import { ListProgramBatchesDto } from './dto/list-batches.dto';
import {
  BatchReadinessResponseDto,
  ProgramBatchResponseDto,
} from './dto/batch-response.dto';
import {
  CreateProgramBatchDto,
  ProgramBatchIdDto,
  ProgramIdDto,
  UpdateProgramBatchDto,
} from './dto/upsert-batch.dto';

@ApiTags('Program Batches')
@Controller('programs/:programId/batches')
export class BatchController {
  constructor(
    private readonly batches: BatchService,
    private readonly lookupService: BatchLookupsService,
  ) {}

  @Get()
  @RequirePermissions('batches.view')
  @ApiOrganizationList('قائمة دفعات البرنامج', ProgramBatchResponseDto)
  list(
    @CurrentCaller() caller: CallerContext,
    @Param() params: ProgramIdDto,
    @Query() query: ListProgramBatchesDto,
  ) {
    return this.batches.list(caller, params.programId, query);
  }

  @Post()
  @RequirePermissions('batches.create')
  @ApiOrganizationCreate('إنشاء دفعة برنامج', ProgramBatchResponseDto)
  create(
    @CurrentCaller() caller: CallerContext,
    @Param() params: ProgramIdDto,
    @Body() dto: CreateProgramBatchDto,
  ) {
    return this.batches.create(caller, params.programId, dto);
  }

  @Get('lookups')
  @RequirePermissions('batches.view')
  @ApiOperation({ summary: 'خيارات محرر الدفعة' })
  lookups(@Param() params: ProgramIdDto) {
    return this.lookupService.get(params.programId);
  }

  @Get(':batchId')
  @RequirePermissions('batches.view')
  @ApiOrganizationRead('تفاصيل دفعة البرنامج', ProgramBatchResponseDto)
  get(
    @CurrentCaller() caller: CallerContext,
    @Param() params: ProgramBatchIdDto,
  ) {
    return this.batches.get(params.batchId, params.programId, caller);
  }

  @Patch(':batchId')
  @RequirePermissions('batches.update')
  @ApiOrganizationMutation('تحديث دفعة البرنامج', ProgramBatchResponseDto)
  update(
    @CurrentCaller() caller: CallerContext,
    @Param() params: ProgramBatchIdDto,
    @Body() dto: UpdateProgramBatchDto,
  ) {
    return this.batches.update(caller, params.programId, params.batchId, dto);
  }

  @Patch(':batchId/status')
  @RequirePermissions('batches.view')
  @ApiOrganizationMutation('تغيير حالة دفعة البرنامج', ProgramBatchResponseDto)
  status(
    @CurrentCaller() caller: CallerContext,
    @Param() params: ProgramBatchIdDto,
    @Body() dto: ChangeBatchStatusDto,
  ) {
    return this.batches.changeStatus(
      caller,
      params.programId,
      params.batchId,
      dto,
    );
  }

  @Get(':batchId/readiness')
  @RequirePermissions('batches.view')
  @ApiOrganizationRead('جاهزية دفعة البرنامج', BatchReadinessResponseDto)
  readiness(
    @CurrentCaller() caller: CallerContext,
    @Param() params: ProgramBatchIdDto,
  ) {
    return this.batches.readiness(params.batchId, params.programId, caller);
  }
}
