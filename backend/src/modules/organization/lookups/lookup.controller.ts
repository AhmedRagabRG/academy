import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import {
  ApiOrganizationCreate,
  ApiOrganizationList,
  ApiOrganizationMutation,
  ApiOrganizationRead,
} from '../../../shared/swagger/organization-api.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import { OrganizationIdParamDto } from '../types/organization.dto';
import {
  CreateLookupGroupDto,
  LookupGroupListDto,
  LookupGroupResponseDto,
  LookupGroupStatusDto,
  UpdateLookupGroupDto,
} from './dto/lookup-group.dto';
import {
  CreateLookupValueDto,
  LookupGroupCodeParamDto,
  LookupValueListDto,
  LookupValueParamDto,
  LookupValueResponseDto,
  LookupValueStatusDto,
  ReorderLookupValuesDto,
  UpdateLookupValueDto,
} from './dto/lookup-value.dto';
import { LookupService } from './lookup.service';
import { OrganizationLookupsService } from './organization-lookups.service';

@ApiTags('Settings - Lookups')
@Controller('settings')
export class LookupController {
  constructor(
    private readonly lookups: LookupService,
    private readonly publicLookups: OrganizationLookupsService,
  ) {}
  @Get('lookups')
  @RequirePermissions('settings.general.view')
  @ApiOrganizationRead('القيم المعيارية', Object)
  async standards() {
    return this.publicLookups.standards();
  }
  @Get('lookup-groups')
  @RequirePermissions('settings.lookups.view')
  @ApiOrganizationList('مجموعات القيم', LookupGroupResponseDto)
  groups(@CurrentCaller() c: CallerContext, @Query() q: LookupGroupListDto) {
    return this.lookups.listGroups(c, q);
  }
  @Post('lookup-groups')
  @RequirePermissions('settings.lookups.create')
  @ApiOrganizationCreate('إنشاء مجموعة', LookupGroupResponseDto)
  createGroup(
    @CurrentCaller() c: CallerContext,
    @Body() d: CreateLookupGroupDto,
  ) {
    return this.lookups.createGroup(c, d);
  }
  @Get('lookup-groups/:id')
  @RequirePermissions('settings.lookups.view')
  @ApiOrganizationRead('تفاصيل مجموعة', LookupGroupResponseDto)
  group(@CurrentCaller() c: CallerContext, @Param() p: OrganizationIdParamDto) {
    return this.lookups.group(c, p.id);
  }
  @Patch('lookup-groups/:id')
  @RequirePermissions('settings.lookups.update')
  @ApiOrganizationMutation('تعديل مجموعة', LookupGroupResponseDto)
  updateGroup(
    @CurrentCaller() c: CallerContext,
    @Param() p: OrganizationIdParamDto,
    @Body() d: UpdateLookupGroupDto,
  ) {
    return this.lookups.updateGroup(c, p.id, d);
  }
  @Patch('lookup-groups/:id/status')
  @RequirePermissions('settings.lookups.update')
  @ApiOrganizationMutation('حالة مجموعة', LookupGroupResponseDto)
  statusGroup(
    @CurrentCaller() c: CallerContext,
    @Param() p: OrganizationIdParamDto,
    @Body() d: LookupGroupStatusDto,
  ) {
    return this.lookups.statusGroup(c, p.id, d);
  }
  @Get('lookups/:groupCode')
  @RequirePermissions('settings.lookups.view')
  @ApiOrganizationList('قيم المجموعة', LookupValueResponseDto)
  values(
    @CurrentCaller() c: CallerContext,
    @Param() p: LookupGroupCodeParamDto,
    @Query() q: LookupValueListDto,
  ) {
    return this.lookups.listValues(c, p.groupCode, q);
  }
  @Post('lookups/:groupCode')
  @RequirePermissions('settings.lookups.create')
  @ApiOrganizationCreate('إنشاء قيمة', LookupValueResponseDto)
  createValue(
    @CurrentCaller() c: CallerContext,
    @Param() p: LookupGroupCodeParamDto,
    @Body() d: CreateLookupValueDto,
  ) {
    return this.lookups.createValue(c, p.groupCode, d);
  }
  @Get('lookups/:groupCode/:id')
  @RequirePermissions('settings.lookups.view')
  @ApiOrganizationRead('تفاصيل قيمة', LookupValueResponseDto)
  value(@CurrentCaller() c: CallerContext, @Param() p: LookupValueParamDto) {
    return this.lookups.value(c, p.groupCode, p.id);
  }
  @Patch('lookups/:groupCode/:id')
  @RequirePermissions('settings.lookups.update')
  @ApiOrganizationMutation('تعديل قيمة', LookupValueResponseDto)
  updateValue(
    @CurrentCaller() c: CallerContext,
    @Param() p: LookupValueParamDto,
    @Body() d: UpdateLookupValueDto,
  ) {
    return this.lookups.updateValue(c, p.groupCode, p.id, d);
  }
  @Patch('lookups/:groupCode/:id/status')
  @RequirePermissions('settings.lookups.update')
  @ApiOrganizationMutation('حالة قيمة', LookupValueResponseDto)
  statusValue(
    @CurrentCaller() c: CallerContext,
    @Param() p: LookupValueParamDto,
    @Body() d: LookupValueStatusDto,
  ) {
    return this.lookups.statusValue(c, p.groupCode, p.id, d);
  }
  @Put('lookups/:groupCode/order')
  @RequirePermissions('settings.lookups.update')
  @ApiOrganizationMutation('ترتيب القيم', LookupValueResponseDto)
  reorder(
    @CurrentCaller() c: CallerContext,
    @Param() p: LookupGroupCodeParamDto,
    @Body() d: ReorderLookupValuesDto,
  ) {
    return this.lookups.reorder(c, p.groupCode, d);
  }
}
