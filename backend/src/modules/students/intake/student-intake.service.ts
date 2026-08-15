import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import {
  AdmissionNotReadyException,
  AdmissionVersionStaleException,
  DuplicateStudentCodeException,
  EnrollmentBatchRuleViolatedException,
  StudentValidationFailedException,
} from '../../../core/exceptions/students.exceptions';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  ADMISSIONS_DOCUMENT_READ_PORT,
  type AdmissionsDocumentReadPort,
} from '../../admissions/types/admissions-document-read.port';
import {
  ADMISSIONS_ENROLLMENT_PORT,
  type AdmissionsEnrollmentPort,
  type EnrollmentHandoff,
} from '../../admissions/types/admissions-enrollment.port';
import {
  CATALOG_PUBLIC_PORT,
  type CatalogPublicPort,
} from '../../catalog/types/catalog-public.port';
import {
  IAM_EMPLOYEE_REFERENCE_PORT,
  type EmployeeReferencePort,
} from '../../identity/types/employee-reference.port';
import {
  ORGANIZATION_MASTER_DATA_PORT,
  type OrganizationMasterDataPort,
} from '../../organization/types/organization-master-data.port';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import {
  PROGRAM_BATCHES_PUBLIC_PORT,
  type ProgramBatchesPublicPort,
} from '../../program-batches/types/program-batches-public.port';
import { StudentDocumentPolicy } from '../documents/student-document.policy';
import { STUDENT_EVENT_NAMES, studentEvent } from '../events/students.events';
import { StudentsLookupsService } from '../lookups/students-lookups.service';
import { StudentCodeService } from '../students/student-code.service';
import { StudentIdentityPolicy } from '../students/student-identity.policy';
import { StudentRepository } from '../students/student.repository';
import { StudentTimelineService } from '../timeline/student-timeline.service';
import { StudentIntakeRepository } from './student-intake.repository';

const OFFERING_KIND_TO_PRISMA = {
  'professional-program': 'PROFESSIONAL_PROGRAM',
  'professional-diploma': 'PROFESSIONAL_DIPLOMA',
  'training-course': 'TRAINING_COURSE',
} as const;

@Injectable()
export class StudentIntakeService {
  constructor(
    private readonly repository: StudentRepository,
    private readonly intake: StudentIntakeRepository,
    private readonly transactions: TransactionManager,
    private readonly codes: StudentCodeService,
    private readonly identity: StudentIdentityPolicy,
    private readonly documents: StudentDocumentPolicy,
    private readonly timeline: StudentTimelineService,
    private readonly lookups: StudentsLookupsService,
    private readonly profile: OrganizationProfileService,
    private readonly events: DomainEventBus,
    @Inject(ADMISSIONS_ENROLLMENT_PORT)
    private readonly admissions: AdmissionsEnrollmentPort,
    @Inject(ADMISSIONS_DOCUMENT_READ_PORT)
    private readonly admissionDocuments: AdmissionsDocumentReadPort,
    @Inject(CATALOG_PUBLIC_PORT)
    private readonly catalog: CatalogPublicPort,
    @Inject(PROGRAM_BATCHES_PUBLIC_PORT)
    private readonly batches: ProgramBatchesPublicPort,
    @Inject(ORGANIZATION_MASTER_DATA_PORT)
    private readonly organization: OrganizationMasterDataPort,
    @Inject(IAM_EMPLOYEE_REFERENCE_PORT)
    private readonly employees: EmployeeReferencePort,
  ) {}

  /**
   * The only way a student comes into existence. Idempotent on
   * `approvalSnapshotId`: a repeat resolves to the stored student and writes
   * nothing (FR-002).
   */
  async intakeFromAdmission(
    caller: CallerContext,
    input: { admissionId: string; admissionVersion: number },
  ): Promise<{ studentId: string; created: boolean }> {
    const organizationId = (await this.profile.get()).organizationId;

    const readiness = await this.admissions.getEnrollmentReadiness(
      input.admissionId,
    );
    if (!readiness.ready)
      throw new AdmissionNotReadyException(
        readiness.findings.map((finding) => this.findingText(finding)),
      );

    const handoff = readiness.handoff;
    if (handoff.admissionVersion !== input.admissionVersion)
      throw new AdmissionVersionStaleException();

    // Idempotency is checked before any work so a retry is cheap.
    const existing = await this.intake.findKey(
      organizationId,
      handoff.approvalSnapshotId,
    );
    if (existing) return { studentId: existing.studentId, created: false };

    this.assertBatchRule(handoff);

    const resolved = await this.resolveReferences(organizationId, handoff);
    const normalized = this.identity.validate(
      {
        fullName: handoff.applicant.fullName,
        primaryPhone: handoff.applicant.primaryPhone,
        ...(handoff.applicant.guardianPhone
          ? { guardianPhone: handoff.applicant.guardianPhone }
          : {}),
        ...(handoff.applicant.nationalId
          ? { nationalId: handoff.applicant.nationalId }
          : {}),
        ...(handoff.applicant.alternativeIdentityReason
          ? {
              alternativeIdentityReason:
                handoff.applicant.alternativeIdentityReason,
            }
          : {}),
        address: handoff.applicant.address,
        dateOfBirth: handoff.applicant.dateOfBirth,
        graduationYear: handoff.applicant.graduationYear,
      },
      this.lookups.identityRules(),
    );

    const admissionDocuments =
      await this.admissionDocuments.listCurrentDocuments(handoff.admissionId);

    const actorName = caller.displayName || 'النظام';
    const today = new Date();
    const enrollmentDate = today.toISOString().slice(0, 10);

    const studentId = await this.transactions
      .run(async (tx) => {
        const studentCode = await this.codes.allocate(
          {
            organizationId,
            academicYear: resolved.academicYear,
            branchId: handoff.registrationBranchId,
            branchCode: resolved.registrationBranchCode,
          },
          tx,
        );

        const student = await this.repository.create(
          {
            organizationId,
            studentCode,
            status: 'ACTIVE',
            fullName: handoff.applicant.fullName.trim(),
            searchName: normalized.searchName,
            primaryPhone: normalized.primaryPhone,
            ...(normalized.guardianPhone
              ? { guardianPhone: normalized.guardianPhone }
              : {}),
            ...(normalized.nationalId
              ? {
                  nationalId: normalized.nationalId,
                  normalizedNationalId: normalized.normalizedNationalId ?? null,
                }
              : {}),
            ...(handoff.applicant.alternativeIdentityReason
              ? {
                  alternativeIdentityReason:
                    handoff.applicant.alternativeIdentityReason,
                }
              : {}),
            address: handoff.applicant.address.trim(),
            dateOfBirth: new Date(`${handoff.applicant.dateOfBirth}T00:00:00Z`),
            qualificationId: handoff.applicant.qualificationId,
            qualificationLabel: resolved.qualificationLabel,
            graduationYear: handoff.applicant.graduationYear,
            registrationBranchId: handoff.registrationBranchId,
            registrationBranchLabel: resolved.registrationBranchLabel,
            studyBranchId: handoff.studyBranchId,
            studyBranchLabel: resolved.studyBranchLabel,
            departmentId: handoff.departmentId,
            departmentLabel: resolved.departmentLabel,
            customerServiceEmployeeId: handoff.customerServiceEmployeeId,
            customerServiceEmployeeName: resolved.customerServiceEmployeeName,
            admissionId: handoff.admissionId,
            admissionReference: handoff.admissionReference,
            approvalSnapshotId: handoff.approvalSnapshotId,
            admissionDate: new Date(`${enrollmentDate}T00:00:00Z`),
            enrollmentDate: new Date(`${enrollmentDate}T00:00:00Z`),
            version: 1,
            createdById: caller.accountId,
            createdByName: actorName,
            updatedById: caller.accountId,
            updatedByName: actorName,
          },
          tx,
        );

        await this.intake.createKey(
          {
            organizationId,
            approvalSnapshotId: handoff.approvalSnapshotId,
            studentId: student.id,
          },
          tx,
        );

        // Labels and codes are frozen copies: archiving a catalog product must
        // never blank a student's history (FR-005).
        await this.intake.createEnrollment(
          {
            studentId: student.id,
            offeringKind:
              OFFERING_KIND_TO_PRISMA[handoff.academic.offeringKind],
            offeringId: handoff.academic.offeringId,
            offeringVersionAtEnrollment: handoff.academic.offeringVersion,
            offeringLabel: resolved.offeringLabel,
            offeringCode: resolved.offeringCode,
            ...(handoff.academic.batchId
              ? {
                  batchId: handoff.academic.batchId,
                  batchVersionAtEnrollment:
                    handoff.academic.batchVersion ?? null,
                  batchLabel: resolved.batchLabel,
                  batchCode: resolved.batchCode,
                }
              : {}),
            registrationBranchLabel: resolved.registrationBranchLabel,
            studyBranchLabel: resolved.studyBranchLabel,
            academicYear: resolved.academicYear,
            enrollmentDate: new Date(`${enrollmentDate}T00:00:00Z`),
            status: 'ACTIVE',
            sourceAdmissionId: handoff.admissionId,
          },
          tx,
        );

        const copiedCount = await this.copyDocuments(
          student.id,
          admissionDocuments,
          { actorId: caller.accountId, actorName },
          tx,
        );

        // The initial lifecycle entry is the only one with a null fromStatus.
        await this.intake.createStatusChange(
          {
            studentId: student.id,
            fromStatus: null,
            toStatus: 'ACTIVE',
            actorId: caller.accountId,
            actorName,
            sourceVersion: 0,
            resultVersion: 1,
          },
          tx,
        );

        await this.timeline.appendAll(
          [
            {
              studentId: student.id,
              category: 'admission-approved',
              actorId: caller.accountId,
              actorName,
              origin: 'admissions',
              subjectRef: handoff.admissionId,
              summary: `تم اعتماد طلب القبول ${handoff.admissionReference}`,
            },
            {
              studentId: student.id,
              category: 'student-created',
              actorId: caller.accountId,
              actorName,
              origin: 'students',
              subjectRef: student.id,
              summary: `تم إنشاء الطالب بكود ${studentCode}`,
            },
            {
              studentId: student.id,
              category: 'enrollment-added',
              actorId: caller.accountId,
              actorName,
              origin: 'students',
              subjectRef: handoff.academic.offeringId,
              summary: `تم تسجيل الطالب في ${resolved.offeringLabel}`,
            },
            ...(copiedCount
              ? [
                  {
                    studentId: student.id,
                    category: 'document-uploaded' as const,
                    actorId: caller.accountId,
                    actorName,
                    origin: 'admissions' as const,
                    summary: `تم نقل ${copiedCount} مستند من طلب القبول`,
                  },
                ]
              : []),
          ],
          tx,
        );

        return student.id;
      })
      .catch((error: unknown) => {
        if (this.isUniqueViolation(error, 'studentCode'))
          throw new DuplicateStudentCodeException();
        throw error;
      });

    // Acknowledged only after the student is durably committed, so a failure
    // here can never orphan a student (FR-038).
    await this.admissions.acknowledgeEnrollment({
      admissionId: handoff.admissionId,
      approvalSnapshotId: handoff.approvalSnapshotId,
      externalStudentReference: studentId,
      expectedVersion: handoff.admissionVersion,
    });

    this.events.emit(
      studentEvent(STUDENT_EVENT_NAMES.created, {
        actorId: caller.accountId,
        studentId,
        operation: 'intake',
        payload: { admissionId: handoff.admissionId },
      }),
    );
    this.events.emit(
      studentEvent(STUDENT_EVENT_NAMES.admissionConverted, {
        actorId: caller.accountId,
        studentId,
        operation: 'admission-converted',
        payload: {
          admissionId: handoff.admissionId,
          approvalSnapshotId: handoff.approvalSnapshotId,
        },
      }),
    );

    return { studentId, created: true };
  }

  /**
   * Copies the admission's current documents into student-owned records.
   * The same `storageFileId` is reused — bytes are not duplicated — but the
   * rows are independent from this moment on (FR-009, research.md R-001).
   */
  private async copyDocuments(
    studentId: string,
    sources: readonly {
      requirementKey: string;
      sourceVersionId: string;
      storageFileId: string;
      fileDescriptor: Record<string, unknown>;
      originalName: string;
      mimeType: string;
      byteSize: number;
      previewLocator?: string;
      uploadedAt: string;
    }[],
    actor: { actorId: string; actorName: string },
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const seenSingleTypes = new Set<string>();
    let copied = 0;

    for (const source of sources) {
      const typeKey = this.documents.mapAdmissionRequirementKey(
        source.requirementKey,
      );
      // An admission requirement with no student equivalent is skipped; its
      // absence simply shows in documentCompletion.
      if (!typeKey) continue;
      const type = this.documents.find(typeKey);
      if (!type) continue;
      if (!type.multiple) {
        if (seenSingleTypes.has(typeKey)) continue;
        seenSingleTypes.add(typeKey);
      }

      const document = await this.intake.createDocumentWithVersion(
        {
          studentId,
          typeKey,
          actorId: actor.actorId,
          actorName: actor.actorName,
          version: {
            storageFileId: source.storageFileId,
            fileDescriptor: source.fileDescriptor as Prisma.InputJsonValue,
            fileName: source.originalName,
            mimeType: source.mimeType,
            byteSize: source.byteSize,
            ...(source.previewLocator
              ? { previewLocator: source.previewLocator }
              : {}),
            uploadAttemptId: `intake:${source.sourceVersionId}`,
            uploadedAt: new Date(source.uploadedAt),
            copiedFromAdmissionVersionId: source.sourceVersionId,
          },
        },
        tx,
      );
      const version = document.versions[0];
      if (version)
        await this.intake.setCurrentVersion(document.id, version.id, tx);
      copied += 1;
    }

    return copied;
  }

  private assertBatchRule(handoff: EnrollmentHandoff): void {
    const isProgram = handoff.academic.offeringKind === 'professional-program';
    if (isProgram !== Boolean(handoff.academic.batchId))
      throw new EnrollmentBatchRuleViolatedException();
  }

  private async resolveReferences(
    organizationId: string,
    handoff: EnrollmentHandoff,
  ) {
    const [
      offering,
      registrationBranch,
      studyBranch,
      department,
      qualification,
      employee,
      academicYears,
    ] = await Promise.all([
      this.catalog.resolve(handoff.academic.offeringId),
      this.organization.resolve('branch', handoff.registrationBranchId),
      this.organization.resolve('branch', handoff.studyBranchId),
      this.organization.resolve('department', handoff.departmentId),
      this.organization.resolveValue(
        'qualifications',
        handoff.applicant.qualificationId,
      ),
      this.employees.resolve(handoff.customerServiceEmployeeId, organizationId),
      this.organization.selectable('academicYear'),
    ]);

    if (!offering)
      throw new StudentValidationFailedException([
        { field: 'academicTarget.offeringId', message: 'المنتج غير موجود' },
      ]);
    if (!registrationBranch || !studyBranch || !department)
      throw new StudentValidationFailedException([
        { field: 'assignment', message: 'بيانات التعيين غير مكتملة' },
      ]);

    const batch = handoff.academic.batchId
      ? await this.batches.resolveHistorical(handoff.academic.batchId)
      : null;

    return {
      offeringLabel: offering.name,
      offeringCode: offering.code,
      batchLabel: batch?.name ?? null,
      batchCode: batch?.code ?? null,
      registrationBranchLabel: registrationBranch.label,
      registrationBranchCode: registrationBranch.code ?? '',
      studyBranchLabel: studyBranch.label,
      departmentLabel: department.label,
      qualificationLabel:
        qualification?.label || handoff.applicant.qualificationLabel || '—',
      customerServiceEmployeeName: employee?.label ?? '—',
      academicYear: this.resolveAcademicYear(academicYears),
    };
  }

  /**
   * The student code embeds an academic year, but no port exposes one
   * numerically. The active academic year's label carries it (e.g. "2026/2027"
   * → 2027); when it cannot be parsed, the current calendar year is used so a
   * code is always allocatable.
   */
  private resolveAcademicYear(
    years: readonly { label: string; code?: string; active: boolean }[],
  ): number {
    const active = years.find((year) => year.active);
    const source = `${active?.label ?? ''} ${active?.code ?? ''}`;
    const matches = source.match(/\d{4}/g);
    if (matches?.length) {
      const parsed = Number(matches[matches.length - 1]);
      if (parsed >= 1900 && parsed <= 2999) return parsed;
    }
    return new Date().getUTCFullYear();
  }

  private findingText(finding: unknown): string {
    if (typeof finding === 'string') return finding;
    if (finding && typeof finding === 'object') {
      const record = finding as Record<string, unknown>;
      const code = record.code ?? record.message ?? record.field;
      if (typeof code === 'string') return code;
    }
    return 'not-ready';
  }

  private isUniqueViolation(error: unknown, field: string): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const record = error as Record<string, unknown>;
    if (record.code !== 'P2002') return false;
    return JSON.stringify(record.meta ?? {}).includes(field);
  }
}
