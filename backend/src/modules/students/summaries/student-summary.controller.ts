import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { StudentNotFoundException } from '../../../core/exceptions/students.exceptions';
import type { CallerContext } from '../../../shared/types/caller-context';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import { StudentPolicy } from '../students/student.policy';
import { StudentRepository } from '../students/student.repository';
import {
  STUDENT_FINANCE_READER_PORT,
  type StudentFinanceReaderPort,
} from '../types/student-finance-reader.port';
import { StudentContextService } from './student-context.service';

export class SummaryRouteDto {
  @IsUUID()
  studentId!: string;
}

@ApiTags('Students - Summaries')
@Controller('students/:studentId')
export class StudentSummaryController {
  constructor(
    private readonly context: StudentContextService,
    private readonly students: StudentRepository,
    private readonly policy: StudentPolicy,
    private readonly profile: OrganizationProfileService,
    @Inject(STUDENT_FINANCE_READER_PORT)
    private readonly finance: StudentFinanceReaderPort,
  ) {}

  /**
   * Always HTTP 200 with a three-state union. The `forbidden` variant is
   * resolved from the caller's permissions *before* the finance port is
   * consulted, so an unauthorized caller cannot infer whether Finance is up.
   * Zeros are never substituted for a failed lookup.
   */
  @Get('financial-summary')
  @RequirePermissions('students.view')
  @ApiOperation({ summary: 'الملخص المالي للطالب' })
  @ApiResponse({
    status: 200,
    description:
      '{state:"available",summary} | {state:"unavailable",reason} | {state:"forbidden"}',
  })
  async financialSummary(
    @Param() params: SummaryRouteDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    await this.assertVisible(caller, params.studentId);
    if (!(caller.permissionKeys ?? []).includes('students.finance.view'))
      return { state: 'forbidden' as const };
    return this.finance.getSummary(params.studentId);
  }

  @Get('context-summary')
  @RequirePermissions('students.view')
  @ApiOperation({ summary: 'ملخص الطالب للوحدات الأخرى' })
  @ApiResponse({
    status: 200,
    description:
      'Compact cross-module read. Carries no note content, document files, address or national identity.',
  })
  async contextSummary(
    @Param() params: SummaryRouteDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    await this.assertVisible(caller, params.studentId);
    return this.context.requireContext(params.studentId);
  }

  private async assertVisible(caller: CallerContext, studentId: string) {
    const organizationId = (await this.profile.get()).organizationId;
    const student = await this.students.findById(studentId, organizationId);
    if (!student) throw new StudentNotFoundException();
    this.policy.assertInScope(caller, student);
  }
}
