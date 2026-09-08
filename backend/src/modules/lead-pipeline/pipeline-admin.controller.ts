import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentCaller } from '../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../shared/types/caller-context';
import { PipelineAdminService } from './pipeline-admin.service';
import {
  CreatePipelineDto,
  CreatePipelineStageDto,
  PipelineStageVersionDto,
  PipelineVersionDto,
  ReorderPipelineStagesDto,
  UpdatePipelineDto,
  UpdatePipelineStageDto,
} from './dto/pipeline-admin.dto';

@Controller('pipelines')
export class PipelineAdminController {
  constructor(private readonly pipelines: PipelineAdminService) {}

  @Get() list(@CurrentCaller() c: CallerContext) {
    return this.pipelines.list(c);
  }

  @Get(':id') detail(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
  ) {
    return this.pipelines.detail(c, id);
  }

  @Post() @RequirePermissions('pipeline.manage') create(
    @CurrentCaller() c: CallerContext,
    @Body() dto: CreatePipelineDto,
  ) {
    return this.pipelines.create(c, dto);
  }

  @Patch(':id') @RequirePermissions('pipeline.manage') update(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: UpdatePipelineDto,
  ) {
    return this.pipelines.update(c, id, dto);
  }

  @Post(':id/archive') @RequirePermissions('pipeline.manage') archive(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: PipelineVersionDto,
  ) {
    return this.pipelines.archive(c, id, dto);
  }

  @Post(':id/restore') @RequirePermissions('pipeline.manage') restore(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: PipelineVersionDto,
  ) {
    return this.pipelines.restore(c, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('pipeline.manage')
  @HttpCode(204)
  remove(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: PipelineVersionDto,
  ) {
    return this.pipelines.remove(c, id, dto.expectedVersion);
  }

  @Post(':id/stages') @RequirePermissions('pipeline.manage') createStage(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: CreatePipelineStageDto,
  ) {
    return this.pipelines.createStage(c, id, dto);
  }

  @Patch(':id/stages/:stageId')
  @RequirePermissions('pipeline.manage')
  updateStage(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Param('stageId') stageId: string,
    @Body() dto: UpdatePipelineStageDto,
  ) {
    return this.pipelines.updateStage(c, id, stageId, dto);
  }

  @Post(':id/stages/:stageId/archive')
  @RequirePermissions('pipeline.manage')
  archiveStage(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Param('stageId') stageId: string,
    @Body() dto: PipelineStageVersionDto,
  ) {
    return this.pipelines.archiveStage(c, id, stageId, dto);
  }

  @Post(':id/stages/:stageId/restore')
  @RequirePermissions('pipeline.manage')
  restoreStage(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Param('stageId') stageId: string,
    @Body() dto: PipelineStageVersionDto,
  ) {
    return this.pipelines.restoreStage(c, id, stageId, dto);
  }

  @Delete(':id/stages/:stageId')
  @RequirePermissions('pipeline.manage')
  removeStage(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Param('stageId') stageId: string,
    @Body() dto: PipelineStageVersionDto,
  ) {
    return this.pipelines.removeStage(c, id, stageId, dto);
  }

  @Put(':id/stages/order')
  @RequirePermissions('pipeline.manage')
  reorder(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: ReorderPipelineStagesDto,
  ) {
    return this.pipelines.reorder(c, id, dto);
  }
}
