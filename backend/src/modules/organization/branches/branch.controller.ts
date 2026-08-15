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
import { BranchService } from './branch.service';
import {
  BranchListDto,
  BranchResponseDto,
  BranchStatusDto,
  CreateBranchDto,
  UpdateBranchDto,
} from './dto/branch.dto';
@ApiTags('Settings - Branches')
@Controller('settings/branches')
export class BranchController {
  constructor(private readonly branches: BranchService) {}
  @Get()
  @RequirePermissions('settings.branches.view')
  @ApiOrganizationList('قائمة الفروع', BranchResponseDto)
  list(@CurrentCaller() c: CallerContext, @Query() q: BranchListDto) {
    return this.branches.list(c, q);
  }
  @Get(':id')
  @RequirePermissions('settings.branches.view')
  @ApiOrganizationRead('تفاصيل الفرع', BranchResponseDto)
  get(@CurrentCaller() c: CallerContext, @Param() p: OrganizationIdParamDto) {
    return this.branches.get(c, p.id);
  }
  @Post()
  @RequirePermissions('settings.branches.create')
  @ApiOrganizationCreate('إنشاء فرع', BranchResponseDto)
  create(@CurrentCaller() c: CallerContext, @Body() d: CreateBranchDto) {
    return this.branches.create(c, d);
  }
  @Patch(':id')
  @RequirePermissions('settings.branches.update')
  @ApiOrganizationMutation('تعديل فرع', BranchResponseDto)
  update(
    @CurrentCaller() c: CallerContext,
    @Param() p: OrganizationIdParamDto,
    @Body() d: UpdateBranchDto,
  ) {
    return this.branches.update(c, p.id, d);
  }
  @Patch(':id/status')
  @RequirePermissions('settings.branches.update')
  @ApiOrganizationMutation('تغيير حالة الفرع', BranchResponseDto)
  status(
    @CurrentCaller() c: CallerContext,
    @Param() p: OrganizationIdParamDto,
    @Body() d: BranchStatusDto,
  ) {
    return this.branches.status(c, p.id, d);
  }
}
