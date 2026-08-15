import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Public } from '../../../core/decorators/public.decorator';
import type { Request, Response } from 'express';
import { MetaWebhookService } from './meta-webhook.service';

type RawRequest = Request & { rawBody?: Buffer };

@Public()
@Controller('inbox/meta/webhook')
export class MetaWebhookController {
  constructor(private readonly webhooks: MetaWebhookService) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() response: Response,
  ) {
    if (!this.webhooks.verifyChallenge(mode, token))
      throw new ForbiddenException();
    return response.status(200).send(challenge ?? '');
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Req() request: RawRequest,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() payload: unknown,
  ) {
    if (
      !request.rawBody ||
      !this.webhooks.verifySignature(request.rawBody, signature)
    )
      throw new ForbiddenException();
    await this.webhooks.ingest(payload);
    return { received: true };
  }
}
