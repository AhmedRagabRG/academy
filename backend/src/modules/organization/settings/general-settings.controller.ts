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
  GeneralSettingsResponseDto,
  UpdateGeneralSettingsDto,
} from './dto/general-settings.dto';
import { GeneralSettingsService } from './general-settings.service';

@ApiTags('Settings - General')
@Controller('settings/general')
export class GeneralSettingsController {
  constructor(private readonly settings: GeneralSettingsService) {}
  @Get()
  @RequirePermissions('settings.general.view')
  @ApiOrganizationRead('الإعدادات العامة', GeneralSettingsResponseDto)
  get() {
    return this.settings.get();
  }
  @Patch()
  @RequirePermissions('settings.general.update')
  @ApiOrganizationMutation('تحديث الإعدادات العامة', GeneralSettingsResponseDto)
  update(
    @CurrentCaller() c: CallerContext,
    @Body() d: UpdateGeneralSettingsDto,
  ) {
    return this.settings.update(c, d);
  }
}
