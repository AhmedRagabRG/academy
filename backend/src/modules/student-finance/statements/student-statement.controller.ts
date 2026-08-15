import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import { ApiFinanceRead } from '../../../shared/swagger/finance-api.decorator';
import { FinanceTimelineService } from './finance-timeline.service';
import { ListTimelineDto } from './dto/list-timeline.dto';
import {
  StudentFinancialProfileDto,
  TimelinePageDto,
} from './dto/statement-response.dto';
import { StudentStatementService } from './student-statement.service';

/** Read-only. Nothing under `/finance/students` mutates finance state. */
@ApiTags('Student Finance — Statements')
@Controller('finance/students')
export class StudentStatementController {
  constructor(
    private readonly statements: StudentStatementService,
    private readonly timeline: FinanceTimelineService,
  ) {}

  @Get(':studentId/profile')
  @RequirePermissions('finance.view')
  @ApiFinanceRead('الملف المالي للطالب', StudentFinancialProfileDto)
  profile(@Param('studentId') studentId: string) {
    return this.statements.profile(studentId);
  }

  @Get(':studentId/timeline')
  @RequirePermissions('finance.timeline.view')
  @ApiFinanceRead('السجل الزمني المالي', TimelinePageDto)
  timelineFor(
    @Param('studentId') studentId: string,
    @Query() query: ListTimelineDto,
    @CurrentCaller() _caller: CallerContext,
  ) {
    return this.timeline.listForStudent(studentId, {
      limit: query.limit ?? 20,
      ...(query.cursor ? { cursor: query.cursor } : {}),
      ...(query.categories?.length ? { categories: query.categories } : {}),
    });
  }
}
