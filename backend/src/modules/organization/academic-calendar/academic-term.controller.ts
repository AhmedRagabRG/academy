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
import { AcademicTermService } from './academic-term.service';
import {
  AcademicTermListDto,
  AcademicTermResponseDto,
  AcademicTermStatusDto,
  CreateAcademicTermDto,
  UpdateAcademicTermDto,
} from './dto/academic-term.dto';

@ApiTags('Settings - Academic Terms')
@Controller('settings/academic-terms')
export class AcademicTermController {
  constructor(private readonly service: AcademicTermService) {}
  @Get()
  @RequirePermissions('settings.academicTerms.view')
  @ApiOrganizationList('قائمة الفصول الأكاديمية', AcademicTermResponseDto)
  list(
    @CurrentCaller() caller: CallerContext,
    @Query() query: AcademicTermListDto,
  ) {
    return this.service.list(caller, query);
  }
  @Get(':id')
  @RequirePermissions('settings.academicTerms.view')
  @ApiOrganizationRead('تفاصيل الفصل الأكاديمي', AcademicTermResponseDto)
  get(
    @CurrentCaller() caller: CallerContext,
    @Param() params: OrganizationIdParamDto,
  ) {
    return this.service.get(caller, params.id);
  }
  @Post()
  @RequirePermissions('settings.academicTerms.create')
  @ApiOrganizationCreate('إنشاء فصل أكاديمي', AcademicTermResponseDto)
  create(
    @CurrentCaller() caller: CallerContext,
    @Body() dto: CreateAcademicTermDto,
  ) {
    return this.service.create(caller, dto);
  }
  @Patch(':id')
  @RequirePermissions('settings.academicTerms.update')
  @ApiOrganizationMutation('تعديل فصل أكاديمي', AcademicTermResponseDto)
  update(
    @CurrentCaller() caller: CallerContext,
    @Param() params: OrganizationIdParamDto,
    @Body() dto: UpdateAcademicTermDto,
  ) {
    return this.service.update(caller, params.id, dto);
  }
  @Patch(':id/status')
  @RequirePermissions('settings.academicTerms.update')
  @ApiOrganizationMutation(
    'تغيير حالة الفصل الأكاديمي',
    AcademicTermResponseDto,
  )
  status(
    @CurrentCaller() caller: CallerContext,
    @Param() params: OrganizationIdParamDto,
    @Body() dto: AcademicTermStatusDto,
  ) {
    return this.service.status(caller, params.id, dto);
  }
}
