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
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  CreateRoleDto,
  ReplaceRolePermissionsDto,
  RoleStatusDto,
  UpdateRoleDto,
} from './dto/role.dto';
import { RoleService } from './role.service';
import { RoleResponseDto } from './dto/role-response.dto';
import {
  ApiEnvelopeResponse,
  ApiIdentityErrors,
} from '../../../core/swagger/api-envelope-response.decorator';
@ApiTags('Settings - Roles')
@Controller('settings/roles')
export class RolesController {
  constructor(private readonly roles: RoleService) {}
  @Get()
  @RequirePermissions('settings.roles.view')
  @ApiEnvelopeResponse(200, RoleResponseDto, { isArray: true })
  @ApiIdentityErrors(401, 403, 422)
  list(@Query() query: { page?: number; pageSize?: number; search?: string }) {
    return this.roles.list(query);
  }
  @Get(':id')
  @RequirePermissions('settings.roles.view')
  @ApiEnvelopeResponse(200, RoleResponseDto)
  @ApiIdentityErrors(401, 403, 404)
  get(@Param('id') id: string) {
    return this.roles.get(id);
  }
  @Post()
  @RequirePermissions('settings.roles.create')
  @ApiEnvelopeResponse(201, RoleResponseDto)
  @ApiIdentityErrors(401, 403, 409, 422)
  create(@CurrentCaller() caller: CallerContext, @Body() dto: CreateRoleDto) {
    return this.roles.create(caller, dto);
  }
  @Patch(':id')
  @RequirePermissions('settings.roles.update')
  @ApiEnvelopeResponse(200, RoleResponseDto)
  @ApiIdentityErrors(401, 403, 404, 409, 422)
  update(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roles.update(caller, id, dto);
  }
  @Patch(':id/status')
  @RequirePermissions('settings.roles.update')
  @ApiEnvelopeResponse(200, RoleResponseDto)
  @ApiIdentityErrors(401, 403, 404, 409)
  status(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Body() dto: RoleStatusDto,
  ) {
    return this.roles.status(caller, id, dto);
  }
  @Put(':id/permissions')
  @RequirePermissions('settings.permissions.update')
  @ApiEnvelopeResponse(200, RoleResponseDto)
  @ApiIdentityErrors(401, 403, 404, 409, 422)
  permissions(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Body() dto: ReplaceRolePermissionsDto,
  ) {
    return this.roles.replacePermissions(id, dto, caller);
  }
}
