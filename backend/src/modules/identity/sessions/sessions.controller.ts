import { Controller, Delete, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import { SessionIdDto } from './dto/session.dto';
import {
  RevokedSessionsResponseDto,
  SessionResponseDto,
} from './dto/session.dto';
import {
  ApiEnvelopeResponse,
  ApiIdentityErrors,
} from '../../../core/swagger/api-envelope-response.decorator';
import { SessionService } from './session.service';

@ApiTags('Identity - Sessions')
@Controller('auth/sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionService) {}
  @Get()
  @ApiEnvelopeResponse(200, SessionResponseDto, { isArray: true })
  @ApiIdentityErrors(401)
  list(@CurrentCaller() caller: CallerContext) {
    return this.sessions.list(caller.accountId, caller.sessionId);
  }
  @Delete(':id')
  @ApiEnvelopeResponse(200)
  @ApiIdentityErrors(401, 404, 409)
  revoke(
    @CurrentCaller() caller: CallerContext,
    @Param() params: SessionIdDto,
  ) {
    return this.sessions.revoke(caller.accountId, caller.sessionId, params.id);
  }
  @Delete()
  @ApiEnvelopeResponse(200, RevokedSessionsResponseDto)
  @ApiIdentityErrors(401)
  revokeOthers(@CurrentCaller() caller: CallerContext) {
    return this.sessions.revokeOthers(caller.accountId, caller.sessionId);
  }
}
