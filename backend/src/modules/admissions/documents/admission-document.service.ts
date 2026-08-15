import { Inject, Injectable } from '@nestjs/common';
import {
  FileTooLargeException,
  FileUnreadableException,
  NotFoundException,
  UnsupportedFileTypeException,
  ValidationException,
} from '../../../core/exceptions';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  STORAGE_SERVICE,
  type StorageService,
  type UploadedFile,
} from '../../../storage/storage.service.interface';
import {
  AdmissionDocumentDecisionDtoValue,
  type AdmissionDocumentReplaceDto,
  type AdmissionDocumentUploadDto,
  type VerifyAdmissionDocumentDto,
  type WithdrawAdmissionDocumentDto,
} from './dto/admission-document.dto';
import {
  ADMISSION_DOCUMENT_DEFAULT_MAX_BYTES,
  deriveAdmissionDocumentState,
  validateDocumentDecision,
  validateRequirementFile,
} from './admission-document.policy';
import {
  AdmissionDocumentRepository,
  type AdmissionDocumentRecord,
  type DocumentVersionRecord,
} from './admission-document.repository';

@Injectable()
export class AdmissionDocumentService {
  constructor(
    private readonly repository: AdmissionDocumentRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  list(admissionId: string): Promise<AdmissionDocumentRecord[]> {
    return this.repository.list(admissionId);
  }

  async upload(
    admissionId: string,
    dto: AdmissionDocumentUploadDto,
    file: UploadedFile,
    caller: CallerContext,
  ): Promise<AdmissionDocumentRecord> {
    const replay = await this.repository.findByIdempotencyKey(
      admissionId,
      dto.idempotencyKey,
    );
    if (replay) {
      const replayedDocument = await this.repository.findDocument(
        admissionId,
        replay.documentId,
      );
      if (replayedDocument) return replayedDocument;
    }
    const requirement = await this.repository.findRequirement(
      admissionId,
      dto.requirementId,
    );
    if (!requirement) throw new NotFoundException();
    this.assertFile(requirement, file);
    return this.persistStoredFile(
      admissionId,
      dto.requirementId,
      undefined,
      dto.expectedVersion,
      dto.idempotencyKey,
      file,
      caller.accountId,
    );
  }

  async replace(
    admissionId: string,
    documentId: string,
    dto: AdmissionDocumentReplaceDto,
    file: UploadedFile,
    caller: CallerContext,
  ): Promise<AdmissionDocumentRecord> {
    const document = await this.repository.findDocument(
      admissionId,
      documentId,
    );
    if (!document) throw new NotFoundException();
    const requirement = await this.repository.findRequirement(
      admissionId,
      document.requirementId,
    );
    if (!requirement) throw new NotFoundException();
    this.assertFile(requirement, file);
    return this.persistStoredFile(
      admissionId,
      requirement.id,
      documentId,
      dto.expectedVersion,
      dto.idempotencyKey,
      file,
      caller.accountId,
    );
  }

  async withdraw(
    admissionId: string,
    documentId: string,
    dto: WithdrawAdmissionDocumentDto,
    caller: CallerContext,
  ): Promise<AdmissionDocumentRecord> {
    return this.repository.withdraw({
      admissionId,
      documentId,
      versionId: dto.documentVersionId,
      expectedVersion: dto.expectedVersion,
      reason: dto.reason?.trim() || undefined,
      actorId: caller.accountId,
    });
  }

  async verify(
    admissionId: string,
    documentId: string,
    dto: VerifyAdmissionDocumentDto,
    caller: CallerContext,
  ): Promise<AdmissionDocumentRecord> {
    if (dto.documentId !== documentId)
      throw new ValidationException([
        { field: 'documentId', message: 'Document identifier mismatch' },
      ]);
    if (!validateDocumentDecision(dto.decision, dto.reason))
      throw new ValidationException([
        { field: 'reason', message: 'Rejection reason is required' },
      ]);
    return this.repository.decide({
      admissionId,
      documentId,
      versionId: dto.versionId,
      expectedVersion: dto.expectedVersion,
      decision:
        dto.decision === AdmissionDocumentDecisionDtoValue.VERIFIED
          ? 'verified'
          : 'rejected',
      reason: dto.reason?.trim() || undefined,
      reviewerId: caller.accountId,
      reviewerName: caller.displayName,
    });
  }

  versions(
    admissionId: string,
    documentId: string,
  ): Promise<DocumentVersionRecord[]> {
    return this.repository.versions(admissionId, documentId);
  }

  state(document: AdmissionDocumentRecord) {
    const decisions = document.currentVersion?.decisions ?? [];
    const latestDecision = [...decisions].sort(
      (left, right) => right.decidedAt.getTime() - left.decidedAt.getTime(),
    )[0];
    return deriveAdmissionDocumentState({
      currentVersion: document.currentVersion,
      latestDecision,
    });
  }

  private assertFile(
    requirement: Parameters<typeof validateRequirementFile>[0],
    file: UploadedFile,
  ): void {
    if (!file?.buffer?.length) throw new FileUnreadableException();
    const error = validateRequirementFile(requirement, {
      mimeType: file.mimetype,
      size: file.size,
    });
    if (error === 'unsupported-type')
      throw new UnsupportedFileTypeException(requirement.allowedMimeTypes);
    if (error === 'file-too-large')
      throw new FileTooLargeException(
        Math.min(
          requirement.maximumBytes,
          ADMISSION_DOCUMENT_DEFAULT_MAX_BYTES,
        ),
      );
  }

  private async persistStoredFile(
    admissionId: string,
    requirementId: string,
    documentId: string | undefined,
    expectedVersion: number,
    idempotencyKey: string,
    file: UploadedFile,
    actorId: string,
  ): Promise<AdmissionDocumentRecord> {
    const descriptor = await this.storage.store(
      file,
      'admission-document',
      `${admissionId}:${idempotencyKey}`,
    );
    try {
      return await this.repository.storeVersion({
        admissionId,
        documentId,
        requirementId,
        expectedVersion,
        idempotencyKey,
        storageFile: descriptor,
        actorId,
      });
    } catch (error: unknown) {
      const replay = await this.repository.findByIdempotencyKey(
        admissionId,
        idempotencyKey,
      );
      if (replay) {
        const replayedDocument = await this.repository.findDocument(
          admissionId,
          replay.documentId,
        );
        if (replayedDocument) return replayedDocument;
      }
      await this.storage.remove(descriptor.id).catch(() => undefined);
      throw error;
    }
  }
}
