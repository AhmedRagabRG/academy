import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  CreateEmployeeDto,
  EmployeeStatusDto,
  ResetPasswordDto,
  UpdateEmployeeDto,
} from './dto/employee-mutations.dto';
import { ListEmployeesDto } from './dto/list-employees.dto';
import { EmployeeService } from './employee.service';
import {
  EffectivePermissionsResponseDto,
  EmployeeResponseDto,
} from './dto/employee-response.dto';
import {
  ApiEnvelopeResponse,
  ApiIdentityErrors,
} from '../../../core/swagger/api-envelope-response.decorator';
@ApiTags('Settings - Users')
@Controller('settings/users')
export class EmployeesController {
  constructor(private readonly employees: EmployeeService) {}
  @Get()
  @RequirePermissions('settings.users.view')
  @ApiEnvelopeResponse(200, EmployeeResponseDto, { isArray: true })
  @ApiIdentityErrors(401, 403, 422)
  list(
    @CurrentCaller() caller: CallerContext,
    @Query() query: ListEmployeesDto,
  ) {
    return this.employees.list(caller, query);
  }
  @Get(':id')
  @RequirePermissions('settings.users.view')
  @ApiEnvelopeResponse(200, EmployeeResponseDto)
  @ApiIdentityErrors(401, 403, 404)
  get(@CurrentCaller() caller: CallerContext, @Param('id') id: string) {
    return this.employees.get(caller, id);
  }
  @Get(':id/effective-permissions')
  @RequirePermissions('settings.users.view')
  @ApiEnvelopeResponse(200, EffectivePermissionsResponseDto)
  @ApiIdentityErrors(401, 403, 404)
  permissions(@CurrentCaller() caller: CallerContext, @Param('id') id: string) {
    return this.employees.effectivePermissions(caller, id);
  }
  @Post()
  @RequirePermissions('settings.users.create')
  @ApiEnvelopeResponse(201, EmployeeResponseDto)
  @ApiIdentityErrors(401, 403, 409, 422)
  create(
    @CurrentCaller() caller: CallerContext,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.employees.create(caller, dto);
  }
  @Patch(':id')
  @RequirePermissions('settings.users.update')
  @ApiEnvelopeResponse(200, EmployeeResponseDto)
  @ApiIdentityErrors(401, 403, 404, 409, 422)
  update(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employees.update(caller, id, dto);
  }
  @Patch(':id/status')
  @RequirePermissions('settings.users.update')
  @ApiEnvelopeResponse(200, EmployeeResponseDto)
  @ApiIdentityErrors(401, 403, 404, 409, 422)
  status(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Body() dto: EmployeeStatusDto,
  ) {
    return this.employees.status(caller, id, dto);
  }
  @Post(':id/reset-password')
  @HttpCode(200)
  @RequirePermissions('settings.users.update')
  @ApiEnvelopeResponse(200)
  @ApiIdentityErrors(401, 403, 404, 409, 422)
  reset(
    @CurrentCaller() caller: CallerContext,
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.employees.resetPassword(caller, id, dto);
  }
}
