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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentCaller } from '../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../shared/types/caller-context';
import { CampaignService } from './campaign.service';
import { WhatsappTemplateService } from './templates/whatsapp-template.service';
import {
  AudiencePreviewDto,
  CampaignDraftDto,
  CampaignListDto,
  ImportAudienceDto,
  LaunchCampaignDto,
  RecipientListDto,
  TemplateListDto,
  TestSendDto,
  UpdateCampaignDto,
} from './dto/campaign.dto';

@Controller('campaigns')
export class CampaignController {
  constructor(
    private readonly campaigns: CampaignService,
    private readonly templates: WhatsappTemplateService,
  ) {}

  @Get() list(@CurrentCaller() c: CallerContext, @Query() q: CampaignListDto) {
    return this.campaigns.list(c, q);
  }

  @Get('lookups') lookups(@CurrentCaller() c: CallerContext) {
    return this.campaigns.lookups(c);
  }

  @Get('templates') templateList(
    @CurrentCaller() c: CallerContext,
    @Query() q: TemplateListDto,
  ) {
    return this.templates.list(c, q);
  }

  @Post('templates/sync')
  @RequirePermissions('campaigns.templates.sync')
  syncTemplates(@CurrentCaller() c: CallerContext) {
    return this.templates.sync(c);
  }

  @Post('audience/preview')
  @HttpCode(200)
  previewAudience(
    @CurrentCaller() c: CallerContext,
    @Body() dto: AudiencePreviewDto,
  ) {
    return this.campaigns.previewAudience(c, dto);
  }

  @Post('audience/import')
  @RequirePermissions('campaigns.create')
  importAudience(
    @CurrentCaller() c: CallerContext,
    @Body() dto: ImportAudienceDto,
  ) {
    return this.campaigns.importAudience(c, dto);
  }

  @Post()
  @RequirePermissions('campaigns.create')
  create(@CurrentCaller() c: CallerContext, @Body() dto: CampaignDraftDto) {
    return this.campaigns.create(c, dto);
  }

  @Get(':id') detail(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
  ) {
    return this.campaigns.detail(c, id);
  }

  @Patch(':id')
  @RequirePermissions('campaigns.update')
  update(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaigns.update(c, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('campaigns.delete')
  @HttpCode(204)
  remove(@CurrentCaller() c: CallerContext, @Param('id') id: string) {
    return this.campaigns.remove(c, id);
  }

  @Get(':id/preview') preview(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
  ) {
    return this.campaigns.preview(c, id);
  }

  @Get(':id/recipients') recipients(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Query() q: RecipientListDto,
  ) {
    return this.campaigns.recipients(c, id, q);
  }

  /** Written straight to the response so the client receives real CSV. */
  @Get(':id/recipients/export')
  @RequirePermissions('campaigns.view')
  async exportRecipients(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Res() response: Response,
  ) {
    const csv = await this.campaigns.exportRecipientsCsv(c, id);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="campaign-recipients.csv"',
    );
    response.setHeader('Cache-Control', 'private, no-store');
    // BOM so Excel opens the Arabic columns in UTF-8.
    response.send(`\uFEFF${csv}`);
  }

  @Post(':id/launch')
  @RequirePermissions('campaigns.launch')
  @HttpCode(200)
  launch(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: LaunchCampaignDto,
  ) {
    return this.campaigns.launch(c, id, dto);
  }

  @Post(':id/pause')
  @RequirePermissions('campaigns.launch')
  @HttpCode(200)
  pause(@CurrentCaller() c: CallerContext, @Param('id') id: string) {
    return this.campaigns.pause(c, id);
  }

  @Post(':id/resume')
  @RequirePermissions('campaigns.launch')
  @HttpCode(200)
  resume(@CurrentCaller() c: CallerContext, @Param('id') id: string) {
    return this.campaigns.resume(c, id);
  }

  @Post(':id/cancel')
  @RequirePermissions('campaigns.launch')
  @HttpCode(200)
  cancel(@CurrentCaller() c: CallerContext, @Param('id') id: string) {
    return this.campaigns.cancel(c, id);
  }

  @Post(':id/test')
  @RequirePermissions('campaigns.launch')
  @HttpCode(200)
  testSend(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: TestSendDto,
  ) {
    return this.campaigns.testSend(c, id, dto);
  }
}
