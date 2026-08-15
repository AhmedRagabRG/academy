import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Idempotency ledger for intake, keyed on the admission's approval snapshot
 * (constitution "Idempotency"; research.md R-010).
 *
 * The key row is inserted in the same transaction as the student, so two
 * concurrent intakes for one snapshot leave exactly one winner — the loser
 * violates the unique constraint and resolves to a read.
 */
@Injectable()
export class StudentIntakeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findKey(
    organizationId: string,
    approvalSnapshotId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).studentIntakeKey.findUnique({
      where: {
        organizationId_approvalSnapshotId: {
          organizationId,
          approvalSnapshotId,
        },
      },
    });
  }

  createKey(
    data: {
      organizationId: string;
      approvalSnapshotId: string;
      studentId: string;
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.studentIntakeKey.create({ data });
  }

  createEnrollment(
    data: Prisma.StudentEnrollmentUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.studentEnrollment.create({ data });
  }

  createDocumentWithVersion(
    input: {
      studentId: string;
      typeKey: string;
      actorId: string;
      actorName: string;
      version: {
        storageFileId: string;
        fileDescriptor: Prisma.InputJsonValue;
        fileName: string;
        mimeType: string;
        byteSize: number;
        previewLocator?: string;
        uploadAttemptId: string;
        uploadedAt: Date;
        copiedFromAdmissionVersionId: string;
      };
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.studentDocument.create({
      data: {
        studentId: input.studentId,
        typeKey: input.typeKey,
        state: 'PRESENT',
        createdById: input.actorId,
        updatedById: input.actorId,
        versions: {
          create: {
            versionNumber: 1,
            storageFileId: input.version.storageFileId,
            fileDescriptor: input.version.fileDescriptor,
            fileName: input.version.fileName,
            mimeType: input.version.mimeType,
            byteSize: input.version.byteSize,
            ...(input.version.previewLocator
              ? { previewLocator: input.version.previewLocator }
              : {}),
            uploadAttemptId: input.version.uploadAttemptId,
            uploadedAt: input.version.uploadedAt,
            uploadedById: input.actorId,
            uploadedByName: input.actorName,
            copiedFromAdmissionVersionId:
              input.version.copiedFromAdmissionVersionId,
          },
        },
      },
      include: { versions: true },
    });
  }

  /** Points the document at its freshly created first version. */
  setCurrentVersion(
    documentId: string,
    versionId: string,
    tx: Prisma.TransactionClient,
  ) {
    return tx.studentDocument.update({
      where: { id: documentId },
      data: { currentVersionId: versionId },
    });
  }

  createStatusChange(
    data: Prisma.StudentStatusChangeUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.studentStatusChange.create({ data });
  }
}
