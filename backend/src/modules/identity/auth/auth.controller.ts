import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { Public } from '../../../core/decorators/public.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import { IdentityAuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import {
  ApiEnvelopeResponse,
  ApiIdentityErrors,
} from '../../../core/swagger/api-envelope-response.decorator';

@ApiTags('Identity - Authentication')
@Controller('auth')
export class IdentityAuthController {
  constructor(private readonly auth: IdentityAuthService) {}
  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiEnvelopeResponse(200, AuthResponseDto)
  @ApiIdentityErrors(401, 403, 422)
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.login(dto, req, res);
  }
  @Public()
  @Get('session')
  @ApiEnvelopeResponse(200, AuthResponseDto, { nullable: true })
  session(
    @CurrentCaller() caller: CallerContext,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.restore(
      caller.accountId,
      caller.authenticatedAt,
      req,
      res,
    );
  }
  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiEnvelopeResponse(200)
  @ApiIdentityErrors(401, 403)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(req, res);
  }
  @Post('logout')
  @HttpCode(200)
  @ApiEnvelopeResponse(200)
  @ApiIdentityErrors(401)
  logout(
    @CurrentCaller() caller: CallerContext,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.logout(caller.accountId, caller.sessionId, res);
  }
}
