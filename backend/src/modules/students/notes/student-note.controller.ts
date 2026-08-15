import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  StudentNoteItemRouteDto,
  StudentNoteRouteDto,
  WriteStudentNoteDto,
} from './dto/student-note.dto';
import { StudentNoteService } from './student-note.service';

@ApiTags('Students - Notes')
@Controller('students/:studentId/notes')
export class StudentNoteController {
  constructor(private readonly notes: StudentNoteService) {}

  @Get()
  @RequirePermissions('students.notes.view')
  @ApiOperation({ summary: 'ملاحظات الطالب' })
  @ApiResponse({
    status: 200,
    description:
      'Author identity survives deactivation — ActorRef.active is false rather than the name being lost.',
  })
  list(
    @Param() params: StudentNoteRouteDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.notes.list(caller, params.studentId);
  }

  @Post()
  @RequirePermissions('students.notes.manage')
  @ApiOperation({ summary: 'إضافة ملاحظة' })
  @ApiResponse({ status: 201, description: 'Created note' })
  @ApiResponse({ status: 422, description: 'note-content-empty' })
  create(
    @Param() params: StudentNoteRouteDto,
    @Body() dto: WriteStudentNoteDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.notes.create(caller, params.studentId, dto);
  }

  @Patch(':noteId')
  @RequirePermissions('students.notes.manage')
  @ApiOperation({ summary: 'تعديل ملاحظة' })
  @ApiResponse({ status: 200, description: 'Updated note' })
  @ApiResponse({ status: 422, description: 'note-content-empty' })
  edit(
    @Param() params: StudentNoteItemRouteDto,
    @Body() dto: WriteStudentNoteDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.notes.edit(caller, params.studentId, params.noteId, dto);
  }

  @Patch(':noteId/archive')
  @RequirePermissions('students.notes.manage')
  @ApiOperation({ summary: 'أرشفة ملاحظة' })
  @ApiResponse({ status: 200, description: 'Archived note; history retained' })
  archive(
    @Param() params: StudentNoteItemRouteDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.notes.archive(caller, params.studentId, params.noteId);
  }
}
