import {
  Body,
  Controller,
  Get,
  Param,
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
import { AdmissionService } from '../admissions/admission.service';
import { AdmissionDocumentPolicyService } from './admission-document-policy.service';
import { AdmissionDocumentService } from './admission-document.service';
import {
  AdmissionDocumentItemRouteDto,
  AdmissionDocumentReplaceDto,
  AdmissionDocumentRouteDto,
  AdmissionDocumentUploadDto,
  RefreshAdmissionDocumentPolicyDto,
  VerifyAdmissionDocumentDto,
  WithdrawAdmissionDocumentDto,
} from './dto/admission-document.dto';

const multipartSchema = {
  type: 'object' as const,
  required: ['file', 'idempotencyKey', 'expectedVersion'],
  properties: {
    file: { type: 'string' as const, format: 'binary' },
    requirementId: { type: 'string' as const, format: 'uuid' },
    idempotencyKey: { type: 'string' as const },
    expectedVersion: { type: 'integer' as const, minimum: 1 },
  },
};

@ApiTags('Admissions - Documents')
@Controller('admissions/:id/documents')
export class AdmissionDocumentController {
  constructor(
    private readonly admissions: AdmissionService,
    private readonly documents: AdmissionDocumentService,
    private readonly policies: AdmissionDocumentPolicyService,
  ) {}

  @Get()
  @RequirePermissions('admissions.documents.view')
  @ApiOperation({ summary: 'قائمة مستندات طلب القبول' })
  @ApiResponse({ status: 200, description: 'Admission document requirements' })
  async list(
    @Param() params: AdmissionDocumentRouteDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    await this.admissions.get(caller, params.id);
    return this.documents.list(params.id);
  }

  @Post()
  @RequirePermissions('admissions.documents.manage')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5_000_000, files: 1 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: multipartSchema })
  @ApiResponse({ status: 201, description: 'Document version uploaded' })
  async upload(
    @Param() params: AdmissionDocumentRouteDto,
    @Body() dto: AdmissionDocumentUploadDto,
    @UploadedFileParameter() file: UploadedFile,
    @CurrentCaller() caller: CallerContext,
  ) {
    await this.admissions.get(caller, params.id);
    return this.documents.upload(params.id, dto, file, caller);
  }

  @Post(':documentId/replace')
  @RequirePermissions('admissions.documents.manage')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5_000_000, files: 1 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: multipartSchema })
  @ApiResponse({ status: 201, description: 'Replacement version uploaded' })
  async replace(
    @Param() params: AdmissionDocumentItemRouteDto,
    @Body() dto: AdmissionDocumentReplaceDto,
    @UploadedFileParameter() file: UploadedFile,
    @CurrentCaller() caller: CallerContext,
  ) {
    await this.admissions.get(caller, params.id);
    return this.documents.replace(
      params.id,
      params.documentId,
      dto,
      file,
      caller,
    );
  }

  @Post(':documentId/withdraw')
  @RequirePermissions('admissions.documents.manage')
  @ApiResponse({ status: 200, description: 'Document version withdrawn' })
  async withdraw(
    @Param() params: AdmissionDocumentItemRouteDto,
    @Body() dto: WithdrawAdmissionDocumentDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    await this.admissions.get(caller, params.id);
    return this.documents.withdraw(params.id, params.documentId, dto, caller);
  }

  @Post(':documentId/verify')
  @RequirePermissions('admissions.documents.verify')
  @ApiResponse({ status: 200, description: 'Immutable decision recorded' })
  async verify(
    @Param() params: AdmissionDocumentItemRouteDto,
    @Body() dto: VerifyAdmissionDocumentDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    await this.admissions.get(caller, params.id);
    return this.documents.verify(params.id, params.documentId, dto, caller);
  }

  @Get(':documentId/versions')
  @RequirePermissions('admissions.documents.view')
  @ApiResponse({ status: 200, description: 'Ordered immutable versions' })
  async versions(
    @Param() params: AdmissionDocumentItemRouteDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    await this.admissions.get(caller, params.id);
    return this.documents.versions(params.id, params.documentId);
  }

  @Post('refresh-policy')
  @RequirePermissions(
    'admissions.academic.manage',
    'admissions.documents.manage',
  )
  @ApiResponse({ status: 200, description: 'Document policy reconciled' })
  async refreshPolicy(
    @Param() params: AdmissionDocumentRouteDto,
    @Body() dto: RefreshAdmissionDocumentPolicyDto,
    @CurrentCaller() caller: CallerContext,
  ) {
    await this.admissions.get(caller, params.id);
    return this.policies.refresh(params.id, dto.expectedVersion, caller);
  }
}
