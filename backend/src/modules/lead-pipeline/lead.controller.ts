import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentCaller } from '../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../shared/types/caller-context';
import { LeadService } from './lead.service';
import {
  AssignLeadDto,
  LeadDraftDto,
  LeadListDto,
  LeadNoteDto,
  MoveLeadDto,
  UpdateLeadDto,
} from './dto/lead.dto';

@Controller('lead-pipeline')
export class LeadController {
  constructor(private readonly leads: LeadService) {}

  @Get('definition') definition(
    @CurrentCaller() c: CallerContext,
    @Query('pipelineId') pipelineId?: string,
  ) {
    return this.leads.definition(c, pipelineId);
  }

  @Get('agents') agents(@CurrentCaller() c: CallerContext) {
    return this.leads.agents(c);
  }

  @Get('board') board(
    @CurrentCaller() c: CallerContext,
    @Query() q: LeadListDto,
  ) {
    return this.leads.board(c, q);
  }

  @Get('leads') list(
    @CurrentCaller() c: CallerContext,
    @Query() q: LeadListDto,
  ) {
    return this.leads.list(c, q);
  }

  @Post('leads')
  @RequirePermissions('pipeline.create')
  create(@CurrentCaller() c: CallerContext, @Body() dto: LeadDraftDto) {
    return this.leads.create(c, dto);
  }

  @Get('leads/:id') detail(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
  ) {
    return this.leads.detail(c, id);
  }

  @Patch('leads/:id')
  @RequirePermissions('pipeline.update')
  update(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leads.update(c, id, dto);
  }

  @Post('leads/:id/stage')
  @RequirePermissions('pipeline.move')
  move(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: MoveLeadDto,
  ) {
    return this.leads.move(c, id, dto);
  }

  @Post('leads/:id/assignment')
  @RequirePermissions('pipeline.assign')
  assign(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: AssignLeadDto,
  ) {
    return this.leads.assign(c, id, dto);
  }

  @Post('leads/:id/notes')
  @RequirePermissions('pipeline.update')
  addNote(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: LeadNoteDto,
  ) {
    return this.leads.addNote(c, id, dto.content);
  }

  @Delete('leads/:id')
  @RequirePermissions('pipeline.manage')
  @HttpCode(204)
  remove(@CurrentCaller() c: CallerContext, @Param('id') id: string) {
    return this.leads.remove(c, id);
  }
}
