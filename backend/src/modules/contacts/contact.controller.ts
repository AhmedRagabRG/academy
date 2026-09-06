import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentCaller } from '../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../shared/types/caller-context';
import { ContactService } from './contact.service';
import {
  ContactCustomFieldDto,
  ContactDraftDto,
  ContactExportDto,
  ContactFieldValueDto,
  ContactGroupDto,
  ContactListDto,
  ContactNoteDto,
  ImportContactsDto,
  UpdateContactDto,
} from './dto/contact.dto';

@Controller('contacts')
export class ContactController {
  constructor(private readonly contacts: ContactService) {}

  @Get() list(@CurrentCaller() c: CallerContext, @Query() q: ContactListDto) {
    return this.contacts.list(c, q);
  }

  @Get('lookups') lookups(@CurrentCaller() c: CallerContext) {
    return this.contacts.lookups(c);
  }

  /** Written straight to the response so the client receives real CSV rather
   *  than the JSON envelope every other endpoint returns. */
  @Get('export')
  @RequirePermissions('contacts.export')
  async exportCsv(
    @CurrentCaller() c: CallerContext,
    @Query() q: ContactExportDto,
    @Res() response: Response,
  ) {
    const csv = await this.contacts.exportCsv(c, q);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="contacts.csv"',
    );
    response.setHeader('Cache-Control', 'private, no-store');
    // BOM so Excel opens the Arabic columns in UTF-8.
    response.send(`\uFEFF${csv}`);
  }

  @Get('groups') groups(@CurrentCaller() c: CallerContext) {
    return this.contacts.groups(c);
  }

  @Post('groups')
  @RequirePermissions('contacts.groups.manage')
  createGroup(@CurrentCaller() c: CallerContext, @Body() dto: ContactGroupDto) {
    return this.contacts.createGroup(c, dto);
  }

  @Patch('groups/:groupId')
  @RequirePermissions('contacts.groups.manage')
  updateGroup(
    @CurrentCaller() c: CallerContext,
    @Param('groupId') groupId: string,
    @Body() dto: ContactGroupDto,
  ) {
    return this.contacts.updateGroup(c, groupId, dto);
  }

  @Delete('groups/:groupId')
  @RequirePermissions('contacts.groups.manage')
  @HttpCode(204)
  removeGroup(
    @CurrentCaller() c: CallerContext,
    @Param('groupId') groupId: string,
  ) {
    return this.contacts.removeGroup(c, groupId);
  }

  @Get('fields') fields(@CurrentCaller() c: CallerContext) {
    return this.contacts.customFields(c);
  }

  @Post('fields')
  @RequirePermissions('contacts.fields.manage')
  createField(
    @CurrentCaller() c: CallerContext,
    @Body() dto: ContactCustomFieldDto,
  ) {
    return this.contacts.createCustomField(c, dto);
  }

  @Delete('fields/:fieldId')
  @RequirePermissions('contacts.fields.manage')
  @HttpCode(204)
  removeField(
    @CurrentCaller() c: CallerContext,
    @Param('fieldId') fieldId: string,
  ) {
    return this.contacts.removeCustomField(c, fieldId);
  }

  @Post('import')
  @RequirePermissions('contacts.import')
  import(@CurrentCaller() c: CallerContext, @Body() dto: ImportContactsDto) {
    return this.contacts.import(c, dto);
  }

  @Post()
  @RequirePermissions('contacts.create')
  create(@CurrentCaller() c: CallerContext, @Body() dto: ContactDraftDto) {
    return this.contacts.create(c, dto);
  }

  @Get(':id') detail(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
  ) {
    return this.contacts.detail(c, id);
  }

  @Patch(':id')
  @RequirePermissions('contacts.update')
  update(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contacts.update(c, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('contacts.delete')
  @HttpCode(204)
  remove(@CurrentCaller() c: CallerContext, @Param('id') id: string) {
    return this.contacts.remove(c, id);
  }

  @Post(':id/notes')
  @RequirePermissions('contacts.notes.manage')
  addNote(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Body() dto: ContactNoteDto,
  ) {
    return this.contacts.addNote(c, id, dto.content);
  }

  @Patch(':id/notes/:noteId')
  @RequirePermissions('contacts.notes.manage')
  editNote(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
    @Body() dto: ContactNoteDto,
  ) {
    return this.contacts.editNote(c, id, noteId, dto.content);
  }

  @Delete(':id/notes/:noteId')
  @RequirePermissions('contacts.notes.manage')
  deleteNote(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
  ) {
    return this.contacts.deleteNote(c, id, noteId);
  }

  @Post(':id/groups/:groupId/toggle')
  @RequirePermissions('contacts.groups.manage')
  toggleGroup(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Param('groupId') groupId: string,
  ) {
    return this.contacts.toggleGroup(c, id, groupId);
  }

  @Put(':id/fields/:fieldId')
  @RequirePermissions('contacts.update')
  setFieldValue(
    @CurrentCaller() c: CallerContext,
    @Param('id') id: string,
    @Param('fieldId') fieldId: string,
    @Body() dto: ContactFieldValueDto,
  ) {
    return this.contacts.setCustomValue(c, id, fieldId, dto.value);
  }
}
