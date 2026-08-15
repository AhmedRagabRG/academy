import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import {
  ApiOrganizationMutation,
  ApiOrganizationRead,
} from '../../../shared/swagger/organization-api.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  OrganizationProfileResponseDto,
  UpdateOrganizationProfileDto,
} from './dto/organization-profile.dto';
import { OrganizationProfileService } from './organization-profile.service';

@ApiTags('Organization Profile')
@Controller('organization/profile')
export class OrganizationProfileController {
  constructor(private readonly profile: OrganizationProfileService) {}
  @Get()
  @RequirePermissions('settings.organization.view')
  @ApiOrganizationRead('ملف المؤسسة', OrganizationProfileResponseDto)
  get() {
    return this.profile.get();
  }
  @Patch()
  @RequirePermissions('settings.organization.update')
  @ApiOrganizationMutation('تحديث ملف المؤسسة', OrganizationProfileResponseDto)
  update(
    @CurrentCaller() c: CallerContext,
    @Body() d: UpdateOrganizationProfileDto,
  ) {
    return this.profile.update(c, d);
  }
}
