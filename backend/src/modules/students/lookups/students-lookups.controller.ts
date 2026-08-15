import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { StudentsLookupsService } from './students-lookups.service';

@ApiTags('Students - Lookups')
@Controller('students/lookups')
export class StudentsLookupsController {
  constructor(private readonly lookups: StudentsLookupsService) {}

  @Get()
  @RequirePermissions('students.view')
  @ApiOperation({ summary: 'قوائم الاختيار الخاصة بالطلاب' })
  @ApiResponse({
    status: 200,
    description:
      'Bounded lookup payload: branches, departments, grades, qualifications, employees, statuses, document types, identity rules, image policy, currency and precision.',
  })
  @ApiResponse({ status: 403, description: 'forbidden' })
  all() {
    return this.lookups.all();
  }
}
