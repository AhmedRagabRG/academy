import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import { ChannelService } from './channel.service';
import {
  ChannelAuthorizationDto,
  ChannelExchangeDto,
  ConnectChannelDto,
  UpdateChannelDto,
} from './dto/channel.dto';

@Controller('inbox/channels')
export class ChannelController {
  constructor(private readonly channels: ChannelService) {}

  @Get()
  @RequirePermissions('inbox.channels.view')
  list(@CurrentCaller() c: CallerContext) {
    return this.channels.list(c);
  }

  @Get('oauth/url')
  @RequirePermissions('inbox.channels.manage')
  authorizationUrl(
    @CurrentCaller() c: CallerContext,
    @Query() q: ChannelAuthorizationDto,
  ) {
    return this.channels.authorizationUrl(c, q.redirectState);
  }

  @Post('oauth/exchange')
  @RequirePermissions('inbox.channels.manage')
  exchange(@CurrentCaller() c: CallerContext, @Body() dto: ChannelExchangeDto) {
    return this.channels.exchange(c, dto);
  }

  @Post()
  @RequirePermissions('inbox.channels.manage')
  connect(@CurrentCaller() c: CallerContext, @Body() dto: ConnectChannelDto) {
    return this.channels.connect(c, dto);
  }

  @Patch(':id')
  @RequirePermissions('inbox.channels.manage')
  update(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.channels.update(c, id, dto);
  }

  @Post(':id/verify')
  @RequirePermissions('inbox.channels.view')
  verify(@CurrentCaller() c: CallerContext, @Param('id') id: string) {
    return this.channels.verify(c, id);
  }

  @Post(':id/disconnect')
  @RequirePermissions('inbox.channels.manage')
  disconnect(@CurrentCaller() c: CallerContext, @Param('id') id: string) {
    return this.channels.disconnect(c, id);
  }

  @Delete(':id')
  @RequirePermissions('inbox.channels.manage')
  @HttpCode(204)
  remove(@CurrentCaller() c: CallerContext, @Param('id') id: string) {
    return this.channels.remove(c, id);
  }
}
