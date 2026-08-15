import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { AdmissionsLookupsService } from './admissions-lookups.service';

@ApiTags('Admissions')
@Controller('admissions')
export class AdmissionsLookupsController {
  constructor(private readonly lookups: AdmissionsLookupsService) {}

  @Get('lookups')
  @RequirePermissions('admissions.view')
  @ApiOperation({ summary: 'خيارات ونماذج القبول' })
  @ApiResponse({ status: 200, description: 'Admissions lookup bundle' })
  get() {
    return this.lookups.get();
  }
}
