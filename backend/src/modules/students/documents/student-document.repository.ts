import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class StudentDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  listForStudent(studentId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).studentDocument.findMany({
      where: { studentId },
      include: { versions: true, currentVersion: true },
    });
  }

  findById(
    documentId: string,
    studentId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).studentDocument.findFirst({
      where: { id: documentId, studentId },
      include: { versions: true, currentVersion: true },
    });
  }

  findByType(
    studentId: string,
    typeKey: string,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).studentDocument.findFirst({
      where: { studentId, typeKey },
      include: { versions: true, currentVersion: true },
    });
  }

  /** Idempotency probe — an attempt id is unique per document. */
  findVersionByAttempt(
    documentId: string,
    uploadAttemptId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).studentDocumentVersion.findUnique({
      where: {
        documentId_uploadAttemptId: { documentId, uploadAttemptId },
      },
    });
  }

  /** A retry may arrive before the document row is known to the caller. */
  findVersionByAttemptForStudent(
    studentId: string,
    uploadAttemptId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).studentDocumentVersion.findFirst({
      where: { uploadAttemptId, document: { studentId } },
      include: { document: true },
    });
  }

  listVersions(documentId: string) {
    return this.prisma.studentDocumentVersion.findMany({
      where: { documentId },
      orderBy: { versionNumber: 'asc' },
    });
  }

  createDocument(
    data: Prisma.StudentDocumentUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.studentDocument.create({ data });
  }

  /** Versions are append-only; nothing here ever updates one. */
  addVersion(
    data: Prisma.StudentDocumentVersionUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.studentDocumentVersion.create({ data });
  }

  async nextVersionNumber(
    documentId: string,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const last = await tx.studentDocumentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    return (last?.versionNumber ?? 0) + 1;
  }

  setCurrentVersion(
    documentId: string,
    versionId: string,
    actorId: string,
    tx: Prisma.TransactionClient,
  ) {
    return tx.studentDocument.update({
      where: { id: documentId },
      data: {
        currentVersionId: versionId,
        state: 'PRESENT',
        updatedById: actorId,
        version: { increment: 1 },
      },
    });
  }

  archive(
    documentId: string,
    input: { reason?: string; actorId: string },
    tx: Prisma.TransactionClient,
  ) {
    return tx.studentDocument.update({
      where: { id: documentId },
      data: {
        state: 'ARCHIVED',
        archivedAt: new Date(),
        archiveReason: input.reason ?? null,
        updatedById: input.actorId,
        version: { increment: 1 },
      },
    });
  }
}
