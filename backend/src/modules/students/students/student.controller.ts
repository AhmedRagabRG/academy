import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import { ListStudentsDto } from './dto/list-students.dto';
import {
  StudentRouteDto,
  UpdateStudentProfileDto,
} from './dto/update-student-profile.dto';
import { StudentExportService } from './student-export.service';
import { StudentService } from './student.service';

/**
 * Note the absent routes: there is deliberately no `POST /students` and no
 * `DELETE /students/:studentId`. Students exist only through intake, and
 * removal is the archive transition. A contract test asserts both stay 404.
 */
@ApiTags('Students')
@Controller('students')
export class StudentController {
  constructor(
    private readonly students: StudentService,
    private readonly exports: StudentExportService,
  ) {}

  @Get()
  @RequirePermissions('students.view')
  @ApiOperation({ summary: 'قائمة الطلاب' })
  @ApiResponse({
    status: 200,
    description:
      'Paginated, branch-scoped list. Phones are redacted to phoneHint; national id, address, documents, notes, timeline and finance are absent.',
  })
  @ApiResponse({ status: 403, description: 'forbidden' })
  list(
    @Query() query: ListStudentsDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.students.list(caller, query);
  }

  @Get('export')
  @RequirePermissions('students.export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="students.csv"')
  @ApiOperation({ summary: 'تصدير الطلاب' })
  @ApiResponse({ status: 200, description: 'CSV with a UTF-8 BOM' })
  @ApiResponse({ status: 403, description: 'forbidden' })
  export(
    @Query() query: ListStudentsDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.exports.toCsv(caller, query);
  }

  @Get(':studentId')
  @RequirePermissions('students.view')
  @ApiOperation({ summary: 'تفاصيل الطالب' })
  @ApiResponse({
    status: 200,
    description:
      'Student detail with enrollments, documentCompletion, availableStatusActions, a fully populated permissions object and status history.',
  })
  @ApiResponse({ status: 403, description: 'forbidden · out-of-scope' })
  @ApiResponse({ status: 404, description: 'not-found' })
  detail(
    @Param() params: StudentRouteDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.students.getDetail(caller, params.studentId);
  }

  @Get(':studentId/enrollments')
  @RequirePermissions('students.enrollments.view')
  @ApiOperation({ summary: 'تسجيلات الطالب' })
  @ApiResponse({
    status: 200,
    description:
      'Read-only enrollment projection with frozen offering and batch labels.',
  })
  @ApiResponse({ status: 404, description: 'not-found' })
  enrollments(
    @Param() params: StudentRouteDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.students.listEnrollments(caller, params.studentId);
  }

  @Patch(':studentId')
  @RequirePermissions('students.update')
  @ApiOperation({ summary: 'تحديث بيانات الطالب' })
  @ApiResponse({ status: 200, description: 'Updated student detail' })
  @ApiResponse({
    status: 409,
    description: 'version-conflict · archived-read-only',
  })
  @ApiResponse({ status: 422, description: 'validation-failed' })
  update(
    @Param() params: StudentRouteDto,
    @Body() dto: UpdateStudentProfileDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.students.updateProfile(caller, params.studentId, dto);
  }
}
