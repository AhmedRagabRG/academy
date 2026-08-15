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
import { DepartmentService } from './department.service';
import {
  CreateDepartmentDto,
  DepartmentListDto,
  DepartmentResponseDto,
  DepartmentStatusDto,
  UpdateDepartmentDto,
} from './dto/department.dto';
@ApiTags('Settings - Departments')
@Controller('settings/departments')
export class DepartmentController {
  constructor(private readonly departments: DepartmentService) {}
  @Get()
  @RequirePermissions('settings.departments.view')
  @ApiOrganizationList('قائمة الأقسام', DepartmentResponseDto)
  list(@CurrentCaller() c: CallerContext, @Query() q: DepartmentListDto) {
    return this.departments.list(c, q);
  }
  @Get(':id')
  @RequirePermissions('settings.departments.view')
  @ApiOrganizationRead('تفاصيل القسم', DepartmentResponseDto)
  get(@CurrentCaller() c: CallerContext, @Param() p: OrganizationIdParamDto) {
    return this.departments.get(c, p.id);
  }
  @Post()
  @RequirePermissions('settings.departments.create')
  @ApiOrganizationCreate('إنشاء قسم', DepartmentResponseDto)
  create(@CurrentCaller() c: CallerContext, @Body() d: CreateDepartmentDto) {
    return this.departments.create(c, d);
  }
  @Patch(':id')
  @RequirePermissions('settings.departments.update')
  @ApiOrganizationMutation('تعديل قسم', DepartmentResponseDto)
  update(
    @CurrentCaller() c: CallerContext,
    @Param() p: OrganizationIdParamDto,
    @Body() d: UpdateDepartmentDto,
  ) {
    return this.departments.update(c, p.id, d);
  }
  @Patch(':id/status')
  @RequirePermissions('settings.departments.update')
  @ApiOrganizationMutation('تغيير حالة القسم', DepartmentResponseDto)
  status(
    @CurrentCaller() c: CallerContext,
    @Param() p: OrganizationIdParamDto,
    @Body() d: DepartmentStatusDto,
  ) {
    return this.departments.status(c, p.id, d);
  }
}
