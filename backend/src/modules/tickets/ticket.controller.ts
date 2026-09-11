import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentCaller } from '../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../shared/types/caller-context';
import type { UploadedFile as StoredFile } from '../../storage/storage.service.interface';
import {
  AssignmentDto,
  CommentDto,
  CreateTicketDto,
  PageDto,
  PriorityDto,
  StatusDto,
  TicketListDto,
  UpdateTicketDto,
  VersionDto,
} from './dto/ticket.dto';
import { TicketService } from './ticket.service';

@Controller('tickets')
export class TicketController {
  constructor(private readonly tickets: TicketService) {}
  @Get('configuration') configuration(@CurrentCaller() c: CallerContext) {
    return this.tickets.configuration(c);
  }
  @Get('dashboard') dashboard(@CurrentCaller() c: CallerContext) {
    return this.tickets.dashboard(c);
  }
  @Get() list(@CurrentCaller() c: CallerContext, @Query() q: TicketListDto) {
    return this.tickets.list(c, q);
  }
  @Post() @RequirePermissions('tickets.create') create(
    @CurrentCaller() c: CallerContext,
    @Body() d: CreateTicketDto,
  ) {
    return this.tickets.create(c, d);
  }
  @Get(':id') get(@CurrentCaller() c: CallerContext, @Param('id') id: string) {
    return this.tickets.get(c, id);
  }
  @Patch(':id') @RequirePermissions('tickets.edit') update(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() d: UpdateTicketDto,
  ) {
    return this.tickets.update(c, id, d);
  }
  @Post(':id/status') @RequirePermissions('tickets.change.status') status(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() d: StatusDto,
  ) {
    return this.tickets.status(c, id, d.status, d.expectedVersion);
  }
  @Post(':id/priority') @RequirePermissions('tickets.change.priority') priority(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() d: PriorityDto,
  ) {
    return this.tickets.priority(c, id, d.priority, d.expectedVersion);
  }
  @Post(':id/assignment') assignment(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() d: AssignmentDto,
  ) {
    return this.tickets.assignment(c, id, d);
  }
  @Post(':id/archive') @RequirePermissions('tickets.archive') archive(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() d: VersionDto,
  ) {
    return this.tickets.archive(c, id, d.expectedVersion);
  }
  @Post(':id/restore') @RequirePermissions('tickets.restore') restore(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() d: VersionDto,
  ) {
    return this.tickets.restore(c, id, d.expectedVersion);
  }
  /**
   * expectedVersion is optional here, so a DELETE with no body at all is a
   * supported call — and that is exactly what the client sends. Nest hands an
   * absent body through as `undefined` rather than `{}`, so reading a property
   * off it threw a 500 on every delete.
   */
  @Delete(':id') @RequirePermissions('tickets.delete') @HttpCode(204) remove(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() d?: Partial<VersionDto>,
  ) {
    return this.tickets.remove(c, id, d?.expectedVersion);
  }
  @Get(':id/comments') comments(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Query() q: PageDto,
  ) {
    return this.tickets.comments(c, id, q.pageSize, q.cursor);
  }
  @Post(':id/comments') @RequirePermissions('tickets.comment') comment(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() d: CommentDto,
  ) {
    return this.tickets.addComment(c, id, d.message);
  }
  @Patch(':id/comments/:commentId')
  @RequirePermissions('tickets.comment')
  editComment(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body() d: CommentDto,
  ) {
    return this.tickets.editComment(c, id, commentId, d.message);
  }
  @Delete(':id/comments/:commentId')
  @RequirePermissions('tickets.comment')
  deleteComment(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    return this.tickets.editComment(c, id, commentId, '', true);
  }
  @Get(':id/activity') activity(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Query() q: PageDto,
  ) {
    return this.tickets.activity(c, id, q.pageSize, q.cursor);
  }
  @Post(':id/attachments')
  @RequirePermissions('tickets.attach.files')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @UploadedFile() file: StoredFile,
    @Headers('upload-attempt') key?: string,
  ) {
    return this.tickets.upload(c, id, file, key);
  }
  @Get(':id/attachments/:attachmentId')
  @Header('Cache-Control', 'private, no-store')
  async download(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    const result = await this.tickets.download(c, id, attachmentId);
    res.type(result.row.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(result.row.name)}"`,
    );
    result.stream.pipe(res);
  }
}
