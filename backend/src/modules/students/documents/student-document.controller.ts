import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile as UploadedFileParameter,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentCaller } from '../../../core/decorators/current-caller.decorator';
import { RequirePermissions } from '../../../core/decorators/require-permissions.decorator';
import type { CallerContext } from '../../../shared/types/caller-context';
import type { UploadedFile } from '../../../storage/storage.service.interface';
import {
  ArchiveStudentDocumentDto,
  ReplaceStudentDocumentDto,
  StudentDocumentItemRouteDto,
  StudentDocumentRouteDto,
  UploadStudentDocumentDto,
} from './dto/student-document.dto';
import { STUDENT_DOCUMENT_MAX_BYTES } from './student-document.policy';
import { StudentDocumentService } from './student-document.service';

const uploadSchema = {
  type: 'object' as const,
  required: ['file', 'typeKey', 'uploadAttemptId', 'expectedVersion'],
  properties: {
    file: { type: 'string' as const, format: 'binary' },
    typeKey: { type: 'string' as const, example: 'national-id' },
    uploadAttemptId: { type: 'string' as const },
    expectedVersion: { type: 'integer' as const, minimum: 1 },
  },
};

const replaceSchema = {
  type: 'object' as const,
  required: ['file', 'uploadAttemptId', 'expectedVersion'],
  properties: {
    file: { type: 'string' as const, format: 'binary' },
    uploadAttemptId: { type: 'string' as const },
    expectedVersion: { type: 'integer' as const, minimum: 1 },
  },
};

@ApiTags('Students - Documents')
@Controller('students/:studentId/documents')
export class StudentDocumentController {
  constructor(private readonly documents: StudentDocumentService) {}

  @Get()
  @RequirePermissions('students.documents.view')
  @ApiOperation({ summary: 'مستندات الطالب' })
  @ApiResponse({
    status: 200,
    description: 'Required types first, then alphabetical by Arabic label.',
  })
  list(
    @Param() params: StudentDocumentRouteDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.documents.list(caller, params.studentId);
  }

  @Get(':documentId/versions')
  @RequirePermissions('students.documents.view')
  @ApiOperation({ summary: 'إصدارات المستند' })
  @ApiResponse({ status: 200, description: 'Append-only version history' })
  versions(
    @Param() params: StudentDocumentItemRouteDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.documents.versions(caller, params.studentId, params.documentId);
  }

  @Post()
  @RequirePermissions('students.documents.manage')
  // The ceiling is the largest published per-type limit; the policy then
  // enforces the specific type's own, smaller limit.
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: STUDENT_DOCUMENT_MAX_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: uploadSchema })
  @ApiOperation({ summary: 'رفع مستند' })
  @ApiResponse({
    status: 201,
    description: 'Stored document with its versions',
  })
  @ApiResponse({ status: 413, description: 'file-too-large' })
  @ApiResponse({
    status: 422,
    description: 'unsupported-file-type · file-unreadable',
  })
  upload(
    @Param() params: StudentDocumentRouteDto,
    @Body() dto: UploadStudentDocumentDto,
    @UploadedFileParameter() file: UploadedFile,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.documents.upload(caller, params.studentId, dto, file);
  }

  @Post(':documentId/replace')
  @RequirePermissions('students.documents.manage')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: STUDENT_DOCUMENT_MAX_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: replaceSchema })
  @ApiOperation({ summary: 'استبدال مستند' })
  @ApiResponse({ status: 201, description: 'New current version appended' })
  @ApiResponse({
    status: 409,
    description: 'document-archived · version-conflict',
  })
  replace(
    @Param() params: StudentDocumentItemRouteDto,
    @Body() dto: ReplaceStudentDocumentDto,
    @UploadedFileParameter() file: UploadedFile,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.documents.replace(
      caller,
      params.studentId,
      params.documentId,
      dto,
      file,
    );
  }

  @Patch(':documentId/archive')
  @RequirePermissions('students.documents.manage')
  @ApiOperation({ summary: 'أرشفة مستند' })
  @ApiResponse({
    status: 200,
    description: 'State becomes archived; versions are retained.',
  })
  @ApiResponse({
    status: 409,
    description: 'document-archived · version-conflict',
  })
  archive(
    @Param() params: StudentDocumentItemRouteDto,
    @Body() dto: ArchiveStudentDocumentDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    return this.documents.archive(
      caller,
      params.studentId,
      params.documentId,
      dto,
    );
  }
}
