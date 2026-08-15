import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { AcademicYearService } from './academic-year.service';
import {
  AcademicYearListDto,
  AcademicYearResponseDto,
  AcademicYearStatusDto,
  ActivateAcademicYearDto,
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
} from './dto/academic-year.dto';

@ApiTags('Settings - Academic Years')
@Controller('settings/academic-years')
export class AcademicYearController {
  constructor(private readonly service: AcademicYearService) {}
  @Get()
  @RequirePermissions('settings.academicYears.view')
  @ApiOrganizationList('قائمة الأعوام الأكاديمية', AcademicYearResponseDto)
  list(
    @CurrentCaller() caller: CallerContext,
    @Query() query: AcademicYearListDto,
  ) {
    return this.service.list(caller, query);
  }
  @Get(':id')
  @RequirePermissions('settings.academicYears.view')
  @ApiOrganizationRead('تفاصيل العام الأكاديمي', AcademicYearResponseDto)
  get(
    @CurrentCaller() caller: CallerContext,
    @Param() params: OrganizationIdParamDto,
  ) {
    return this.service.get(caller, params.id);
  }
  @Post()
  @RequirePermissions('settings.academicYears.create')
  @ApiOrganizationCreate('إنشاء عام أكاديمي', AcademicYearResponseDto)
  create(
    @CurrentCaller() caller: CallerContext,
    @Body() dto: CreateAcademicYearDto,
  ) {
    return this.service.create(caller, dto);
  }
  @Patch(':id')
  @RequirePermissions('settings.academicYears.update')
  @ApiOrganizationMutation('تعديل عام أكاديمي', AcademicYearResponseDto)
  update(
    @CurrentCaller() caller: CallerContext,
    @Param() params: OrganizationIdParamDto,
    @Body() dto: UpdateAcademicYearDto,
  ) {
    return this.service.update(caller, params.id, dto);
  }
  @Patch(':id/status')
  @RequirePermissions('settings.academicYears.update')
  @ApiOrganizationMutation(
    'تغيير حالة العام الأكاديمي',
    AcademicYearResponseDto,
  )
  status(
    @CurrentCaller() caller: CallerContext,
    @Param() params: OrganizationIdParamDto,
    @Body() dto: AcademicYearStatusDto,
  ) {
    return this.service.status(caller, params.id, dto);
  }
  @Post(':id/activate')
  @RequirePermissions('settings.academicYears.update')
  @ApiOrganizationMutation('تفعيل العام الأكاديمي', AcademicYearResponseDto)
  activate(
    @CurrentCaller() caller: CallerContext,
    @Param() params: OrganizationIdParamDto,
    @Body() dto: ActivateAcademicYearDto,
  ) {
    return this.service.activate(caller, params.id, dto.expectedVersion);
  }
}
