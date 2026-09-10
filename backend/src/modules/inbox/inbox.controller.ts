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
  Sse,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentCaller } from '../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../shared/types/caller-context';
import type { UploadedFile as StoredFile } from '../../storage/storage.service.interface';
import {
  AiControlDto,
  AssignmentDto,
  InboxListDto,
  NoteDto,
  ReplyDto,
  StatusDto,
} from './dto/inbox.dto';
import { InboxService } from './inbox.service';
import { InboxRealtimeService } from './inbox-realtime.service';

@Controller('inbox')
export class InboxController {
  constructor(
    private readonly inbox: InboxService,
    private readonly realtime: InboxRealtimeService,
  ) {}
  @Sse('events') events() {
    return this.realtime.stream();
  }
  @Get() list(@CurrentCaller() c: CallerContext, @Query() q: InboxListDto) {
    return this.inbox.list(c, q);
  }
  @Get('dashboard') dashboard(
    @CurrentCaller() c: CallerContext,
    @Query() q: InboxListDto,
  ) {
    return this.inbox.dashboard(c, q);
  }
  @Get('lookups') lookups(@CurrentCaller() c: CallerContext) {
    return this.inbox.lookups(c);
  }
  @Post('attachments')
  @RequirePermissions('inbox.reply')
  @UseInterceptors(FileInterceptor('file', { limits: { files: 1 } }))
  uploadAttachment(
    @CurrentCaller() c: CallerContext,
    @UploadedFile() file: StoredFile,
  ) {
    return this.inbox.stageAttachment(c, file);
  }
  @Get(':id') detail(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
  ) {
    return this.inbox.detail(c, id);
  }
  @Post(':id/read') read(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
  ) {
    return this.inbox.markRead(c, id);
  }
  @Post(':id/replies') reply(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: ReplyDto,
  ) {
    return this.inbox.sendReply(c, id, dto);
  }
  @Post(':id/ai')
  @RequirePermissions('inbox.ai.control')
  controlAi(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: AiControlDto,
  ) {
    return this.inbox.setAiMode(c, id, dto);
  }
  @Post(':id/assignment') assign(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: AssignmentDto,
  ) {
    return this.inbox.assign(c, id, dto);
  }
  @Post(':id/status') status(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: StatusDto,
  ) {
    return this.inbox.changeStatus(c, id, dto.status);
  }
  @Post(':id/tags/:tagId/toggle') tag(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Param('tagId') tagId: string,
  ) {
    return this.inbox.toggleTag(c, id, tagId);
  }
  @Post(':id/archive') archive(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
  ) {
    return this.inbox.archive(c, id);
  }
  @Post(':id/restore') restore(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
  ) {
    return this.inbox.restore(c, id);
  }
  @Delete(':id') @HttpCode(204) remove(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
  ) {
    return this.inbox.delete(c, id);
  }
  @Post(':id/notes') addNote(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: NoteDto,
  ) {
    return this.inbox.addNote(c, id, dto.content);
  }
  @Patch(':id/notes/:noteId') editNote(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
    @Body() dto: NoteDto,
  ) {
    return this.inbox.editNote(c, id, noteId, dto.content);
  }
  @Delete(':id/notes/:noteId') @HttpCode(204) deleteNote(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
  ) {
    return this.inbox.deleteNote(c, id, noteId);
  }
}
