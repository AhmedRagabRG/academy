import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import {
  StudentDocumentArchivedException,
  StudentNotFoundException,
  StudentValidationFailedException,
  StudentVersionConflictException,
} from '../../../core/exceptions/students.exceptions';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import type { FileDescriptor } from '../../../shared/types/file-descriptor';
import {
  STORAGE_SERVICE,
  type StorageService,
  type UploadedFile,
} from '../../../storage/storage.service.interface';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import { STUDENT_EVENT_NAMES, studentEvent } from '../events/students.events';
import { StudentMapper } from '../mappers/student.mapper';
import { StudentPolicy } from '../students/student.policy';
import { StudentRepository } from '../students/student.repository';
import { StudentTimelineService } from '../timeline/student-timeline.service';
import type {
  ArchiveStudentDocumentDto,
  ReplaceStudentDocumentDto,
  UploadStudentDocumentDto,
} from './dto/student-document.dto';
import { StudentDocumentPolicy } from './student-document.policy';
import { StudentDocumentRepository } from './student-document.repository';

@Injectable()
export class StudentDocumentService {
  constructor(
    private readonly repository: StudentDocumentRepository,
    private readonly students: StudentRepository,
    private readonly policy: StudentDocumentPolicy,
    private readonly studentPolicy: StudentPolicy,
    private readonly mapper: StudentMapper,
    private readonly timeline: StudentTimelineService,
    private readonly transactions: TransactionManager,
    private readonly profile: OrganizationProfileService,
    private readonly events: DomainEventBus,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async list(caller: CallerContext, studentId: string) {
    await this.loadStudent(caller, studentId);
    const rows = await this.repository.listForStudent(studentId);
    return this.mapper
      .sortDocuments(rows)
      .map((row) => this.mapper.document(row));
  }

  async versions(caller: CallerContext, studentId: string, documentId: string) {
    await this.loadStudent(caller, studentId);
    const document = await this.repository.findById(documentId, studentId);
    if (!document) throw new StudentNotFoundException();
    const rows = await this.repository.listVersions(documentId);
    return rows.map((row) => this.mapper.documentVersion(row));
  }

  async completionFor(studentId: string) {
    const rows = await this.repository.listForStudent(studentId);
    return this.policy.completion(rows);
  }

  async upload(
    caller: CallerContext,
    studentId: string,
    dto: UploadStudentDocumentDto,
    file: UploadedFile,
  ) {
    const student = await this.loadStudent(caller, studentId);
    this.studentPolicy.assertMutable(this.mapper.status(student.status));

    const type = this.policy.find(dto.typeKey);
    if (!type)
      throw new StudentValidationFailedException([
        { field: 'typeKey', message: 'نوع المستند غير مدعوم' },
      ]);

    // A repeat of the same attempt resolves to the stored version and performs
    // no write at all (FR-033).
    const replayed = await this.repository.findVersionByAttemptForStudent(
      studentId,
      dto.uploadAttemptId,
    );
    if (replayed) return this.reload(replayed.documentId, studentId);

    // Re-validated server-side regardless of any client check (FR-034).
    this.policy.assertFileAcceptable(type, file);

    const existing = type.multiple
      ? null
      : await this.repository.findByType(studentId, dto.typeKey);
    if (existing && existing.state === 'ARCHIVED')
      throw new StudentDocumentArchivedException();

    const stored = await this.storage.store(
      file,
      'student-document',
      dto.uploadAttemptId,
    );

    const documentId = await this.transactions.run(async (tx) => {
      await this.assertStudentVersion(
        studentId,
        student.organizationId,
        dto.expectedVersion,
        caller,
        tx,
      );

      const target =
        existing ??
        (await this.repository.createDocument(
          {
            studentId,
            typeKey: dto.typeKey,
            state: 'PRESENT',
            createdById: caller.accountId,
            updatedById: caller.accountId,
          },
          tx,
        ));

      const versionNumber = await this.repository.nextVersionNumber(
        target.id,
        tx,
      );
      const version = await this.repository.addVersion(
        this.versionData(
          target.id,
          versionNumber,
          stored,
          dto.uploadAttemptId,
          caller,
          file,
        ),
        tx,
      );
      await this.repository.setCurrentVersion(
        target.id,
        version.id,
        caller.accountId,
        tx,
      );

      await this.timeline.append(
        {
          studentId,
          category:
            versionNumber === 1 ? 'document-uploaded' : 'document-replaced',
          actorId: caller.accountId,
          actorName: caller.displayName || 'موظف',
          origin: 'students',
          subjectRef: target.id,
          summary: `تم رفع مستند ${type.label}`,
        },
        tx,
      );

      return target.id;
    });

    this.events.emit(
      studentEvent(STUDENT_EVENT_NAMES.documentUploaded, {
        actorId: caller.accountId,
        studentId,
        operation: 'document-uploaded',
        payload: { documentId, typeKey: dto.typeKey },
      }),
    );

    return this.reload(documentId, studentId);
  }

  /** Replacement appends a version; no earlier version is ever removed. */
  async replace(
    caller: CallerContext,
    studentId: string,
    documentId: string,
    dto: ReplaceStudentDocumentDto,
    file: UploadedFile,
  ) {
    const student = await this.loadStudent(caller, studentId);
    this.studentPolicy.assertMutable(this.mapper.status(student.status));

    const document = await this.repository.findById(documentId, studentId);
    if (!document) throw new StudentNotFoundException();
    if (document.state === 'ARCHIVED')
      throw new StudentDocumentArchivedException();

    const type = this.policy.find(document.typeKey);
    if (!type)
      throw new StudentValidationFailedException([
        { field: 'typeKey', message: 'نوع المستند غير مدعوم' },
      ]);

    const replayed = await this.repository.findVersionByAttempt(
      documentId,
      dto.uploadAttemptId,
    );
    if (replayed) return this.reload(documentId, studentId);

    this.policy.assertFileAcceptable(type, file);

    const stored = await this.storage.store(
      file,
      'student-document',
      dto.uploadAttemptId,
    );

    await this.transactions.run(async (tx) => {
      await this.assertStudentVersion(
        studentId,
        student.organizationId,
        dto.expectedVersion,
        caller,
        tx,
      );
      const versionNumber = await this.repository.nextVersionNumber(
        documentId,
        tx,
      );
      const version = await this.repository.addVersion(
        this.versionData(
          documentId,
          versionNumber,
          stored,
          dto.uploadAttemptId,
          caller,
          file,
        ),
        tx,
      );
      await this.repository.setCurrentVersion(
        documentId,
        version.id,
        caller.accountId,
        tx,
      );
      await this.timeline.append(
        {
          studentId,
          category: 'document-replaced',
          actorId: caller.accountId,
          actorName: caller.displayName || 'موظف',
          origin: 'students',
          subjectRef: documentId,
          summary: `تم استبدال مستند ${type.label}`,
        },
        tx,
      );
    });

    this.events.emit(
      studentEvent(STUDENT_EVENT_NAMES.documentReplaced, {
        actorId: caller.accountId,
        studentId,
        operation: 'document-replaced',
        payload: { documentId },
      }),
    );

    return this.reload(documentId, studentId);
  }

  /** Archiving keeps every version; it only changes state (FR-032). */
  async archive(
    caller: CallerContext,
    studentId: string,
    documentId: string,
    dto: ArchiveStudentDocumentDto,
  ) {
    const student = await this.loadStudent(caller, studentId);
    this.studentPolicy.assertMutable(this.mapper.status(student.status));

    const document = await this.repository.findById(documentId, studentId);
    if (!document) throw new StudentNotFoundException();
    if (document.state === 'ARCHIVED')
      throw new StudentDocumentArchivedException();

    await this.transactions.run(async (tx) => {
      await this.assertStudentVersion(
        studentId,
        student.organizationId,
        dto.expectedVersion,
        caller,
        tx,
      );
      await this.repository.archive(
        documentId,
        {
          ...(dto.reason ? { reason: dto.reason.trim() } : {}),
          actorId: caller.accountId,
        },
        tx,
      );
      await this.timeline.append(
        {
          studentId,
          category: 'document-archived',
          actorId: caller.accountId,
          actorName: caller.displayName || 'موظف',
          origin: 'students',
          subjectRef: documentId,
          summary: 'تم أرشفة مستند',
        },
        tx,
      );
    });

    this.events.emit(
      studentEvent(STUDENT_EVENT_NAMES.documentArchived, {
        actorId: caller.accountId,
        studentId,
        operation: 'document-archived',
        payload: { documentId },
      }),
    );

    return this.reload(documentId, studentId);
  }

  private versionData(
    documentId: string,
    versionNumber: number,
    stored: FileDescriptor,
    uploadAttemptId: string,
    caller: CallerContext,
    file: UploadedFile,
  ): Prisma.StudentDocumentVersionUncheckedCreateInput {
    return {
      documentId,
      versionNumber,
      storageFileId: stored.id,
      fileDescriptor: stored as unknown as Prisma.InputJsonValue,
      fileName: stored.originalName || file.originalname,
      mimeType: stored.mimeType || file.mimetype,
      byteSize: stored.size || file.size,
      ...(stored.url ? { previewLocator: stored.url } : {}),
      uploadAttemptId,
      uploadedById: caller.accountId,
      uploadedByName: caller.displayName || 'موظف',
    };
  }

  private async assertStudentVersion(
    studentId: string,
    organizationId: string,
    expectedVersion: number,
    caller: CallerContext,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const result = await this.students.updateCompareAndSwap(
      studentId,
      organizationId,
      expectedVersion,
      {
        updatedById: caller.accountId,
        updatedByName: caller.displayName || 'موظف',
      },
      tx,
    );
    if (result.count === 0) {
      const latest = await this.students.findById(
        studentId,
        organizationId,
        tx,
      );
      if (!latest) throw new StudentNotFoundException();
      throw new StudentVersionConflictException(latest.version);
    }
  }

  private async loadStudent(caller: CallerContext, studentId: string) {
    const organizationId = (await this.profile.get()).organizationId;
    const student = await this.students.findById(studentId, organizationId);
    if (!student) throw new StudentNotFoundException();
    this.studentPolicy.assertInScope(caller, student);
    return student;
  }

  private async reload(documentId: string, studentId: string) {
    const row = await this.repository.findById(documentId, studentId);
    if (!row) throw new StudentNotFoundException();
    return this.mapper.document(row);
  }
}
