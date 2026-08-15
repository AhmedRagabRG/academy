import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/profile.dto';
import { ProfileService } from './profile.service';
import { EmployeeResponseDto } from '../employees/dto/employee-response.dto';
import {
  ApiEnvelopeResponse,
  ApiIdentityErrors,
} from '../../../core/swagger/api-envelope-response.decorator';

@ApiTags('Identity - Profile')
@Controller('auth')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}
  @Get('profile')
  @ApiEnvelopeResponse(200, EmployeeResponseDto)
  @ApiIdentityErrors(401)
  get(@CurrentCaller() caller: CallerContext) {
    return this.profile.get(caller.accountId);
  }
  @Patch('profile')
  @ApiEnvelopeResponse(200, EmployeeResponseDto)
  @ApiIdentityErrors(401, 409, 422)
  update(
    @CurrentCaller() caller: CallerContext,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profile.update(caller, dto);
  }
  @Post('change-password')
  @HttpCode(200)
  @ApiEnvelopeResponse(200)
  @ApiIdentityErrors(401, 409, 422)
  changePassword(
    @CurrentCaller() caller: CallerContext,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.profile.changePassword(caller, dto);
  }
}
