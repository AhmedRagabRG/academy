import { Injectable } from '@nestjs/common';
import type {
  Student,
  StudentDocument,
  StudentDocumentVersion,
  StudentEnrollment,
  StudentNote,
  StudentStatusChange,
  StudentStatus as PrismaStudentStatus,
  StudentEnrollmentStatus as PrismaEnrollmentStatus,
  StudentOfferingKind as PrismaOfferingKind,
  StudentDocumentState as PrismaDocumentState,
} from '../../../../prisma/generated/client';
import { StudentDocumentPolicy } from '../documents/student-document.policy';
import type {
  ActorRef,
  StudentDocumentState,
  StudentEnrollmentStatus,
  StudentOfferingKind,
  StudentStatus,
} from '../types/students.types';

export type ActiveLookup = (id: string) => boolean;

type DocumentWithCurrent = StudentDocument & {
  currentVersion?: StudentDocumentVersion | null;
};

@Injectable()
export class StudentMapper {
  constructor(private readonly documents: StudentDocumentPolicy) {}

  status(value: PrismaStudentStatus): StudentStatus {
    return value.toLowerCase() as StudentStatus;
  }

  enrollmentStatus(value: PrismaEnrollmentStatus): StudentEnrollmentStatus {
    return value.toLowerCase() as StudentEnrollmentStatus;
  }

  offeringKind(value: PrismaOfferingKind): StudentOfferingKind {
    return value.toLowerCase().replace(/_/g, '-') as StudentOfferingKind;
  }

  documentState(value: PrismaDocumentState): StudentDocumentState {
    return value.toLowerCase() as StudentDocumentState;
  }

  /**
   * Masks all but the last four digits. This is a privacy control, not a
   * display nicety — the list projection must never carry the full phone, so
   * the row shape below simply has no field to put it in.
   */
  phoneHint(phone: string): string {
    const digits = (phone ?? '').replace(/\D/g, '');
    return digits.length <= 4 ? '••••' : `••••••${digits.slice(-4)}`;
  }

  actor(id: string, name: string, isActive?: ActiveLookup): ActorRef {
    return { id, name, active: isActive ? isActive(id) : true };
  }

  /** The stored file's public URL, from the locator or the descriptor. */
  private previewUrl(row: StudentDocumentVersion): string | undefined {
    if (row.previewLocator) return row.previewLocator;
    const descriptor: unknown = row.fileDescriptor;
    if (
      typeof descriptor === 'object' &&
      descriptor !== null &&
      'url' in descriptor &&
      typeof (descriptor as { url: unknown }).url === 'string'
    )
      return (descriptor as { url: string }).url;
    return undefined;
  }

  private dateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  /** The redacted list row (FR-023, FR-024). */
  listRow(
    student: Student & {
      enrollments: {
        offeringLabel: string;
        batchLabel: string | null;
      }[];
      _count: { enrollments: number };
    },
  ) {
    const primary = student.enrollments[0];
    return {
      id: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      phoneHint: this.phoneHint(student.primaryPhone),
      registrationBranchLabel: student.registrationBranchLabel,
      studyBranchLabel: student.studyBranchLabel,
      departmentLabel: student.departmentLabel,
      primaryOfferingLabel: primary?.offeringLabel ?? null,
      primaryBatchLabel: primary?.batchLabel ?? null,
      customerServiceEmployeeName: student.customerServiceEmployeeName,
      status: this.status(student.status),
      enrollmentCount: student._count.enrollments,
      updatedAt: student.updatedAt.toISOString(),
      version: student.version,
    };
  }

  identity(student: Student) {
    return {
      fullName: student.fullName,
      primaryPhone: student.primaryPhone,
      ...(student.guardianName ? { guardianName: student.guardianName } : {}),
      ...(student.guardianPhone
        ? { guardianPhone: student.guardianPhone }
        : {}),
      ...(student.nationalId ? { nationalId: student.nationalId } : {}),
      ...(student.alternativeIdentityReason
        ? { alternativeIdentityReason: student.alternativeIdentityReason }
        : {}),
      address: student.address,
      dateOfBirth: this.dateOnly(student.dateOfBirth),
      qualificationId: student.qualificationId,
      qualificationLabel: student.qualificationLabel,
      graduationYear: student.graduationYear,
      ...(student.profileImageUrl
        ? { profileImageUrl: student.profileImageUrl }
        : {}),
    };
  }

  assignment(student: Student) {
    return {
      registrationBranchId: student.registrationBranchId,
      registrationBranchLabel: student.registrationBranchLabel,
      studyBranchId: student.studyBranchId,
      studyBranchLabel: student.studyBranchLabel,
      departmentId: student.departmentId,
      departmentLabel: student.departmentLabel,
      ...(student.academicGradeId
        ? {
            academicGradeId: student.academicGradeId,
            academicGradeLabel: student.academicGradeLabel,
          }
        : {}),
      customerServiceEmployeeId: student.customerServiceEmployeeId,
      customerServiceEmployeeName: student.customerServiceEmployeeName,
    };
  }

  /** Carried from the admission decision; never editable here. */
  system(student: Student) {
    return {
      admissionId: student.admissionId,
      admissionReference: student.admissionReference,
      approvalSnapshotId: student.approvalSnapshotId,
      admissionDate: this.dateOnly(student.admissionDate),
      enrollmentDate: this.dateOnly(student.enrollmentDate),
    };
  }

  enrollment(row: StudentEnrollment) {
    return {
      id: row.id,
      studentId: row.studentId,
      offeringKind: this.offeringKind(row.offeringKind),
      offeringId: row.offeringId,
      offeringVersionAtEnrollment: row.offeringVersionAtEnrollment,
      offeringLabel: row.offeringLabel,
      offeringCode: row.offeringCode,
      batchId: row.batchId,
      batchVersionAtEnrollment: row.batchVersionAtEnrollment,
      batchLabel: row.batchLabel,
      batchCode: row.batchCode,
      registrationBranchLabel: row.registrationBranchLabel,
      studyBranchLabel: row.studyBranchLabel,
      academicYear: row.academicYear,
      enrollmentDate: this.dateOnly(row.enrollmentDate),
      status: this.enrollmentStatus(row.status),
      sourceAdmissionId: row.sourceAdmissionId,
    };
  }

  documentVersion(row: StudentDocumentVersion, isActive?: ActiveLookup) {
    return {
      id: row.id,
      versionNumber: row.versionNumber,
      fileName: row.fileName,
      mimeType: row.mimeType,
      size: row.byteSize,
      // `previewLocator` is only written when a caller supplies one, and intake
      // carries it across only if Admissions had one — so it is null for every
      // document a student received at enrolment. The stored file's own
      // descriptor always carries the URL, so fall back to it rather than
      // reporting a file that exists as unavailable.
      ...(this.previewUrl(row) ? { previewUrl: this.previewUrl(row) } : {}),
      uploadedAt: row.uploadedAt.toISOString(),
      uploadedBy: this.actor(row.uploadedById, row.uploadedByName, isActive),
      uploadAttemptId: row.uploadAttemptId,
    };
  }

  document(
    row: DocumentWithCurrent & { versions?: StudentDocumentVersion[] },
    isActive?: ActiveLookup,
  ) {
    const type = this.documents.find(row.typeKey);
    return {
      id: row.id,
      studentId: row.studentId,
      type: type ?? {
        key: row.typeKey,
        label: row.typeKey,
        required: false,
        multiple: false,
        allowedMimeTypes: [],
        maxBytes: 0,
      },
      state: this.documentState(row.state),
      currentVersionId: row.currentVersionId,
      ...(row.archiveReason ? { archiveReason: row.archiveReason } : {}),
      versions: (row.versions ?? [])
        .slice()
        .sort((a, b) => a.versionNumber - b.versionNumber)
        .map((version) => this.documentVersion(version, isActive)),
    };
  }

  /** Required types first, then alphabetical by Arabic label (FR-035). */
  sortDocuments<T extends { typeKey: string }>(rows: readonly T[]): T[] {
    return rows
      .slice()
      .sort((a, b) => this.documents.compare(a.typeKey, b.typeKey));
  }

  statusChange(row: StudentStatusChange, isActive?: ActiveLookup) {
    return {
      id: row.id,
      fromStatus: row.fromStatus ? this.status(row.fromStatus) : null,
      toStatus: this.status(row.toStatus),
      ...(row.reason ? { reason: row.reason } : {}),
      actor: this.actor(row.actorId, row.actorName, isActive),
      occurredAt: row.occurredAt.toISOString(),
      sourceVersion: row.sourceVersion,
      resultVersion: row.resultVersion,
    };
  }

  /**
   * `author` survives the employee being deactivated — the UI renders
   * "(inactive)" from `active:false` rather than losing the name (FR-049).
   */
  note(row: StudentNote, isActive?: ActiveLookup) {
    return {
      id: row.id,
      studentId: row.studentId,
      content: row.content,
      author: this.actor(row.authorId, row.authorName, isActive),
      createdAt: row.createdAt.toISOString(),
      ...(row.editedAt
        ? {
            editedAt: row.editedAt.toISOString(),
            editedBy: this.actor(
              row.editedById ?? row.authorId,
              row.editedByName ?? row.authorName,
              isActive,
            ),
          }
        : {}),
      ...(row.archivedAt ? { archivedAt: row.archivedAt.toISOString() } : {}),
    };
  }

  audit(student: Student, isActive?: ActiveLookup) {
    return {
      version: student.version,
      createdAt: student.createdAt.toISOString(),
      createdBy: this.actor(
        student.createdById,
        student.createdByName,
        isActive,
      ),
      updatedAt: student.updatedAt.toISOString(),
      updatedBy: this.actor(
        student.updatedById,
        student.updatedByName,
        isActive,
      ),
    };
  }
}
