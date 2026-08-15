import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import { PermissionService } from './permission.service';
import { PermissionGroupResponseDto } from './dto/role-response.dto';
import {
  ApiEnvelopeResponse,
  ApiIdentityErrors,
} from '../../../core/swagger/api-envelope-response.decorator';
@ApiTags('Settings - Permissions')
@Controller('settings/permissions')
export class PermissionsController {
  constructor(private readonly permissions: PermissionService) {}
  @Get('catalog')
  @RequirePermissions('settings.permissions.view')
  @ApiEnvelopeResponse(200, PermissionGroupResponseDto, { isArray: true })
  @ApiIdentityErrors(401, 403)
  catalogue() {
    return this.permissions.catalogue();
  }
}
