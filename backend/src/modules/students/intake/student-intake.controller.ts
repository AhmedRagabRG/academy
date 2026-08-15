import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import { StudentService } from '../students/student.service';
import { StudentIntakeDto } from './dto/student-intake.dto';
import { StudentIntakeService } from './student-intake.service';

@ApiTags('Students - Intake')
@Controller('students/intake')
export class StudentIntakeController {
  constructor(
    private readonly intake: StudentIntakeService,
    private readonly students: StudentService,
  ) {}

  @Post()
  @HttpCode(201)
  @RequirePermissions('students.intake')
  @ApiOperation({
    summary: 'تحويل طلب قبول معتمد إلى طالب',
    description:
      'The only way a student is created. Idempotent on the admission approval snapshot: repeating the call resolves to the same student and writes nothing.',
  })
  @ApiResponse({ status: 201, description: 'Created student detail' })
  @ApiResponse({
    status: 409,
    description:
      'admission-not-ready · admission-version-stale · duplicate-student-code',
  })
  @ApiResponse({
    status: 422,
    description: 'enrollment-batch-rule-violated · validation-failed',
  })
  async intakeFromAdmission(
    @Body() dto: StudentIntakeDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    const { studentId } = await this.intake.intakeFromAdmission(caller, dto);
    return this.students.getDetail(caller, studentId);
  }
}
