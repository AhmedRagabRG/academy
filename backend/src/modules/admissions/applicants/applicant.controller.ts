import { Body, Controller, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import { ApiAdmissionMutation } from '../../../shared/swagger/admissions-api.decorator';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import { AdmissionResponseDto } from '../admissions/dto/admission-response.dto';
import { ApplicantService } from './applicant.service';
import { ArchiveApplicantDto } from './dto/archive-applicant.dto';

@ApiTags('Admissions - Applicants')
@Controller('applicants')
export class ApplicantController {
  constructor(
    private readonly applicants: ApplicantService,
    private readonly organization: OrganizationProfileService,
  ) {}

  @Patch(':applicantId/archive')
  @RequirePermissions('admissions.archive')
  @ApiAdmissionMutation('أرشفة المتقدم', AdmissionResponseDto)
  async archive(
    @Param('applicantId') applicantId: string,
    @Body() dto: ArchiveApplicantDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    const organization = await this.organization.get();
    return this.applicants.archive(
      organization.organizationId,
      applicantId,
      dto,
      caller.accountId,
    );
  }
}
