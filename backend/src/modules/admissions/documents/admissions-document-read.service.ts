import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type {
  AdmissionDocumentSnapshot,
  AdmissionsDocumentReadPort,
} from '../types/admissions-document-read.port';

/**
 * Implements ADMISSIONS_DOCUMENT_READ_PORT. Returns only documents that have a
 * usable current version, so a withdrawn or failed upload is never handed to a
 * consumer as if it were evidence.
 */
@Injectable()
export class AdmissionsDocumentReadService implements AdmissionsDocumentReadPort {
  constructor(private readonly prisma: PrismaService) {}

  async listCurrentDocuments(
    admissionId: string,
  ): Promise<AdmissionDocumentSnapshot[]> {
    const records = await this.prisma.admissionDocument.findMany({
      where: { admissionId, currentVersionId: { not: null } },
      include: { currentVersion: true },
      orderBy: { requirementKey: 'asc' },
    });

    return records.flatMap((record) => {
      const version = record.currentVersion;
      if (!version || version.status !== 'AVAILABLE') return [];
      return [
        {
          requirementKey: record.requirementKey,
          sourceDocumentId: record.id,
          sourceVersionId: version.id,
          storageFileId: version.storageFileId,
          fileDescriptor: this.asRecord(version.fileDescriptor),
          originalName: version.originalName,
          mimeType: version.mimeType,
          byteSize: version.byteSize,
          ...(version.previewLocator
            ? { previewLocator: version.previewLocator }
            : {}),
          uploadedAt: version.uploadedAt.toISOString(),
          uploadedById: version.uploadedBy,
        },
      ];
    });
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }
}
