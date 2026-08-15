import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import { StudentTimelineReadService } from './student-timeline-read.service';

export class TimelineRouteDto {
  @IsUUID()
  studentId!: string;
}

export class TimelineQueryDto {
  @ApiPropertyOptional({ default: 25, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Opaque cursor from the previous page' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description:
      'Comma-separated categories, e.g. status-changed,document-uploaded',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}

@ApiTags('Students - Timeline')
@Controller('students/:studentId')
export class StudentTimelineController {
  constructor(private readonly timeline: StudentTimelineReadService) {}

  @Get('timeline')
  @RequirePermissions('students.timeline.view')
  @ApiOperation({ summary: 'الخط الزمني للطالب' })
  @ApiResponse({
    status: 200,
    description:
      'Cursor-paginated `{ items, nextCursor }`. Events sharing a timestamp order deterministically by sequence.',
  })
  timelinePage(
    @Param() params: TimelineRouteDto,
    @Query() query: TimelineQueryDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.timeline.page(caller, params.studentId, query);
  }

  @Get('status-history')
  @RequirePermissions('students.view')
  @ApiOperation({ summary: 'سجل حالات الطالب' })
  @ApiResponse({ status: 200, description: 'Immutable lifecycle entries' })
  statusHistory(
    @Param() params: TimelineRouteDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.timeline.statusHistory(caller, params.studentId);
  }
}
