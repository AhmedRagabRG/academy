import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  BulkStudentStatusDto,
  ChangeStudentStatusDto,
  StudentStatusRouteDto,
} from './dto/student-status.dto';
import { StudentStatusService } from './student-status.service';

/**
 * Both routes are guarded by `students.view` at the endpoint level; the
 * specific authority for each transition (manage / archive / activate /
 * correct) is enforced per transition inside the service, because one endpoint
 * serves transitions with different permissions.
 */
@ApiTags('Students - Lifecycle')
@Controller('students')
export class StudentStatusController {
  constructor(private readonly statuses: StudentStatusService) {}

  @Patch(':studentId/status')
  @RequirePermissions('students.view')
  @ApiOperation({ summary: 'تغيير حالة الطالب' })
  @ApiResponse({ status: 200, description: 'Full updated student detail' })
  @ApiResponse({
    status: 409,
    description:
      'invalid-status-transition (with allowed[]) · version-conflict',
  })
  @ApiResponse({ status: 422, description: 'reason-required' })
  @ApiResponse({ status: 403, description: 'forbidden · out-of-scope' })
  change(
    @Param() params: StudentStatusRouteDto,
    @Body() dto: ChangeStudentStatusDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.statuses.change(caller, params.studentId, dto);
  }

  @Post('bulk-status')
  @RequirePermissions('students.view')
  @ApiOperation({ summary: 'تغيير حالة مجموعة من الطلاب' })
  @ApiResponse({
    status: 201,
    description:
      'One outcome row per requested student. Partial success is expected: applied items are never rolled back.',
  })
  bulk(
    @Body() dto: BulkStudentStatusDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.statuses.bulk(caller, dto);
  }
}
