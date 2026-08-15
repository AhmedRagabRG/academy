import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { AdmissionAlreadyUnderReviewException } from '../../../core/exceptions/admissions.exceptions';
import {
  DomainException,
  ForbiddenException,
  InvalidTransitionException,
  NotFoundException,
  VersionConflictException,
} from '../../../core/exceptions/domain.exception';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import type { CallerContext } from '../../../shared/types/caller-context';
import { AdmissionReadinessService } from '../readiness/admission-readiness.service';
import type { AdmissionStatus } from '../types/admissions.types';
import { AdmissionPolicy } from './admission.policy';
import { AdmissionRepository } from './admission.repository';

const TO_DB_STATUS = {
  draft: 'DRAFT',
  submitted: 'SUBMITTED',
  'under-review': 'UNDER_REVIEW',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  enrolled: 'ENROLLED',
  archived: 'ARCHIVED',
} as const;

const FROM_DB_STATUS: Readonly<Record<string, AdmissionStatus>> = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under-review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ENROLLED: 'enrolled',
  ARCHIVED: 'archived',
};

interface ApprovalPersistence {
  createApprovalSnapshot(
    data: Prisma.AdmissionApprovalSnapshotUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ): Promise<{ id: string }>;
  listLifecycle(
    admissionId: string,
    organizationId: string,
  ): Promise<unknown[]>;
}

export interface AdmissionTransitionInput {
  admissionId: string;
  organizationId: string;
  toStatus: Exclude<AdmissionStatus, 'enrolled'>;
  expectedVersion: number;
  reason?: string;
  caller: CallerContext;
}

export interface AdmissionTransitionResult {
  admissionId: string;
  fromStatus: AdmissionStatus;
  status: AdmissionStatus;
  version: number;
  approvalSnapshotId?: string;
}

export interface BulkAdmissionTransitionResult {
  admissionId: string;
  success: boolean;
  result?: AdmissionTransitionResult;
  error?: { code: string; message: string };
}

@Injectable()
export class AdmissionLifecycleService {
  constructor(
    @Inject(AdmissionRepository)
    private readonly repository: AdmissionRepository,
    private readonly policy: AdmissionPolicy,
    private readonly readiness: AdmissionReadinessService,
    private readonly events: DomainEventBus,
  ) {}

  async transition(
    input: AdmissionTransitionInput,
  ): Promise<AdmissionTransitionResult> {
    const aggregate = await this.repository.findAggregate(
      input.admissionId,
      input.organizationId,
    );
    if (!aggregate) throw new NotFoundException();
    if (aggregate.version !== input.expectedVersion)
      throw new VersionConflictException(aggregate.version);

    const fromStatus = domainStatus(aggregate.status);
    const rule = this.policy.transition(fromStatus, input.toStatus);
    if (!rule.allowed) throw new InvalidTransitionException();
    if (
      rule.permission &&
      !input.caller.permissionKeys.includes(rule.permission)
    )
      throw new ForbiddenException();
    if (
      rule.permission &&
      !input.caller.permissionKeys.includes(rule.permission)
    )
      throw new ForbiddenException();
    if (!this.policy.hasRequiredReason(rule, input.reason))
      throw new DomainException(
        'REASON_REQUIRED',
        'يجب إدخال سبب لهذا الإجراء',
        422,
        [{ field: 'reason', message: 'reason-required' }],
      );
    if (
      fromStatus === 'under-review' &&
      rule.action !== 'archive' &&
      !this.policy.canActAsReviewer(
        aggregate.activeReviewerId,
        input.caller.accountId,
      )
    )
      throw new AdmissionAlreadyUnderReviewException();

    if (
      rule.readinessAction === 'submit' ||
      rule.readinessAction === 'approve'
    ) {
      const result = await this.readiness.evaluate(
        input.admissionId,
        input.organizationId,
        rule.readinessAction,
      );
      if (!result.ready) throw notReady(result.findings);
    }

    const persistence = this.repository as AdmissionRepository &
      ApprovalPersistence;
    const result = await this.repository.transaction(async (tx) => {
      const current = await this.repository.findAggregate(
        input.admissionId,
        input.organizationId,
        tx,
      );
      if (!current) throw new NotFoundException();
      if (current.version !== input.expectedVersion)
        throw new VersionConflictException(current.version);
      if (domainStatus(current.status) !== fromStatus)
        throw new InvalidTransitionException();
      if (rule.acquiresReviewer && current.activeReviewerId)
        throw new AdmissionAlreadyUnderReviewException();

      const now = new Date();
      const resultVersion = current.version + 1;
      let approvalSnapshotId: string | undefined;
      if (input.toStatus === 'approved') {
        if (
          !current.currentSelectionRevision ||
          !current.currentFinancialRevision ||
          !current.currentDocumentPolicySnapshot
        )
          throw notReady([]);
        const verifiedDocumentVersionIds = current.documents
          .map((document) => {
            const version = document.currentVersion;
            return version?.status === 'AVAILABLE' &&
              version.decisions.at(-1)?.decision === 'VERIFIED'
              ? version.id
              : null;
          })
          .filter((id): id is string => Boolean(id));
        const snapshot = await persistence.createApprovalSnapshot(
          {
            admissionId: current.id,
            sourceAdmissionVersion: resultVersion,
            selectionRevisionId: current.currentSelectionRevision.id,
            financialRevisionId: current.currentFinancialRevision.id,
            documentPolicySnapshotId: current.currentDocumentPolicySnapshot.id,
            assignmentSnapshot: {
              registrationBranchId: current.registrationBranchId,
              studyBranchId: current.studyBranchId,
              departmentId: current.departmentId,
              customerServiceEmployeeId: current.customerServiceEmployeeId,
            },
            applicantSnapshot: {
              applicantId: current.applicant.id,
              fullName: current.applicant.fullName,
              dateOfBirth: current.applicant.dateOfBirth
                .toISOString()
                .slice(0, 10),
              qualificationId: current.applicant.qualificationId,
              // Full identity is pinned here so the enrollment handoff stays
              // immutable rather than re-reading a mutable applicant row.
              qualificationLabel: current.applicant.qualificationLabel,
              primaryPhone: current.applicant.primaryPhone,
              guardianPhone: current.applicant.guardianPhone,
              nationalId: current.applicant.nationalId,
              alternativeIdentityReason:
                current.applicant.alternativeIdentityReason,
              address: current.applicant.address,
              graduationYear: current.applicant.graduationYear,
            },
            verifiedDocumentVersionIds,
            academicTarget: {
              offeringKind: current.currentSelectionRevision.offeringKind,
              offeringId: current.currentSelectionRevision.offeringId,
              offeringVersion: current.currentSelectionRevision.offeringVersion,
              batchId: current.currentSelectionRevision.batchId,
              batchVersion: current.currentSelectionRevision.batchVersion,
            },
            requiredAmountMinor:
              current.currentFinancialRevision.requiredAmountMinor,
            currency: current.currentFinancialRevision.currency,
            idempotencyKey: `admission-approval:${current.id}`,
            approvedBy: input.caller.accountId,
          },
          tx,
        );
        approvalSnapshotId = snapshot.id;
      }

      const updateData: Prisma.AdmissionUncheckedUpdateManyInput = {
        updatedBy: input.caller.accountId,
        ...(rule.acquiresReviewer
          ? {
              activeReviewerId: input.caller.accountId,
              activeReviewerName: input.caller.displayName,
              reviewStartedAt: now,
            }
          : {}),
        ...(rule.clearsReviewer
          ? {
              activeReviewerId: null,
              activeReviewerName: null,
              reviewStartedAt: null,
            }
          : {}),
        ...(approvalSnapshotId ? { approvalSnapshotId } : {}),
        ...(input.toStatus === 'archived'
          ? { archiveReason: input.reason?.trim(), archivedAt: now }
          : {}),
      };
      const changed = await this.repository.transitionCompareAndSwap(
        current.id,
        input.organizationId,
        input.expectedVersion,
        TO_DB_STATUS[fromStatus],
        TO_DB_STATUS[input.toStatus],
        updateData,
        tx,
      );
      if (changed.count !== 1)
        throw new VersionConflictException(current.version);

      await this.appendHistories({
        admissionId: current.id,
        fromStatus,
        toStatus: input.toStatus,
        reason: input.reason,
        sourceVersion: current.version,
        resultVersion,
        caller: input.caller,
        approvalSnapshotId,
        tx,
      });
      return {
        admissionId: current.id,
        fromStatus,
        status: input.toStatus,
        version: resultVersion,
        ...(approvalSnapshotId ? { approvalSnapshotId } : {}),
      };
    });

    this.emit(result, input.organizationId, input.caller);
    return result;
  }

  async transitionBulk(
    items: readonly Omit<
      AdmissionTransitionInput,
      'caller' | 'organizationId'
    >[],
    organizationId: string,
    caller: CallerContext,
  ): Promise<BulkAdmissionTransitionResult[]> {
    const results: BulkAdmissionTransitionResult[] = [];
    for (const item of items) {
      try {
        const result = await this.transition({
          ...item,
          organizationId,
          caller,
        });
        results.push({ admissionId: item.admissionId, success: true, result });
      } catch (error) {
        results.push({
          admissionId: item.admissionId,
          success: false,
          error: normalizeError(error),
        });
      }
    }
    return results;
  }

  lifecycle(admissionId: string, organizationId: string): Promise<unknown[]> {
    const persistence = this.repository as AdmissionRepository &
      ApprovalPersistence;
    return persistence.listLifecycle(admissionId, organizationId);
  }

  async acknowledgeEnrollment(input: {
    admissionId: string;
    organizationId: string;
    approvalSnapshotId: string;
    externalStudentReference: string;
    expectedVersion: number;
    actorId: string;
  }): Promise<{ admissionId: string; status: 'enrolled'; version: number }> {
    const current = await this.repository.findAggregate(
      input.admissionId,
      input.organizationId,
    );
    if (!current) throw new NotFoundException();
    if (current.status === 'ENROLLED') {
      if (
        current.externalEnrollmentReference === input.externalStudentReference
      )
        return {
          admissionId: current.id,
          status: 'enrolled',
          version: current.version,
        };
      throw new DomainException(
        'ENROLLMENT_CONFLICT',
        'تم ربط القبول بطالب مختلف',
        409,
      );
    }
    if (
      current.status !== 'APPROVED' ||
      current.approvalSnapshotId !== input.approvalSnapshotId
    )
      throw new InvalidTransitionException();
    if (current.version !== input.expectedVersion)
      throw new VersionConflictException(current.version);
    const readiness = await this.readiness.evaluate(
      current.id,
      input.organizationId,
      'enroll',
    );
    if (!readiness.ready) throw notReady(readiness.findings);

    const result = await this.repository.transaction(async (tx) => {
      const row = await this.repository.findAggregate(
        current.id,
        input.organizationId,
        tx,
      );
      if (!row) throw new NotFoundException();
      if (row.version !== input.expectedVersion)
        throw new VersionConflictException(row.version);
      const resultVersion = row.version + 1;
      const changed = await this.repository.transitionCompareAndSwap(
        row.id,
        input.organizationId,
        row.version,
        'APPROVED',
        'ENROLLED',
        {
          externalEnrollmentReference: input.externalStudentReference,
          updatedBy: input.actorId,
        },
        tx,
      );
      if (changed.count !== 1) throw new VersionConflictException(row.version);
      const caller = enrollmentCaller(input.actorId);
      await this.appendHistories({
        admissionId: row.id,
        fromStatus: 'approved',
        toStatus: 'enrolled',
        sourceVersion: row.version,
        resultVersion,
        caller,
        approvalSnapshotId: input.approvalSnapshotId,
        tx,
      });
      return {
        admissionId: row.id,
        status: 'enrolled' as const,
        version: resultVersion,
      };
    });
    this.events.emit({
      name: 'admissions.enrolled',
      occurredAt: new Date().toISOString(),
      actor: { accountId: input.actorId },
      target: { type: 'admission', id: result.admissionId },
      operation: 'enroll',
      payload: { version: result.version },
    });
    return result;
  }

  private async appendHistories(input: {
    admissionId: string;
    fromStatus: AdmissionStatus;
    toStatus: AdmissionStatus;
    reason?: string;
    sourceVersion: number;
    resultVersion: number;
    caller: CallerContext;
    approvalSnapshotId?: string;
    tx: Prisma.TransactionClient;
  }): Promise<void> {
    await this.repository.appendLifecycle(
      {
        admissionId: input.admissionId,
        fromStatus: TO_DB_STATUS[input.fromStatus],
        toStatus: TO_DB_STATUS[input.toStatus],
        reason: input.reason?.trim(),
        actorId: input.caller.accountId,
        actorName: input.caller.displayName,
        sourceVersion: input.sourceVersion,
        resultVersion: input.resultVersion,
      },
      input.tx,
    );
    await this.repository.appendTimeline(
      {
        admissionId: input.admissionId,
        kind: timelineKind(input.toStatus),
        sourceAdmissionVersion: input.sourceVersion,
        resultAdmissionVersion: input.resultVersion,
        actorId: input.caller.accountId,
        actorName: input.caller.displayName,
        metadata: {
          fromStatus: input.fromStatus,
          toStatus: input.toStatus,
          ...(input.approvalSnapshotId
            ? { approvalSnapshotId: input.approvalSnapshotId }
            : {}),
        },
      },
      input.tx,
    );
  }

  private emit(
    result: AdmissionTransitionResult,
    organizationId: string,
    caller: CallerContext,
  ): void {
    this.events.emit({
      name:
        result.status === 'archived'
          ? 'admissions.archived'
          : 'admissions.status-changed',
      occurredAt: new Date().toISOString(),
      actor: { accountId: caller.accountId },
      target: { type: 'admission', id: result.admissionId },
      operation: result.status,
      payload: {
        organizationId,
        version: result.version,
        fromStatus: result.fromStatus,
        toStatus: result.status,
      },
    });
  }
}

function domainStatus(status: string): AdmissionStatus {
  const value = FROM_DB_STATUS[status];
  if (!value) throw new InvalidTransitionException();
  return value;
}

function timelineKind(
  status: AdmissionStatus,
): 'STATUS_CHANGED' | 'APPROVED' | 'REJECTED' | 'ARCHIVED' | 'ENROLLED' {
  if (status === 'approved') return 'APPROVED';
  if (status === 'rejected') return 'REJECTED';
  if (status === 'archived') return 'ARCHIVED';
  if (status === 'enrolled') return 'ENROLLED';
  return 'STATUS_CHANGED';
}

function notReady(
  findings: readonly { field?: string; message: string }[],
): DomainException {
  return new DomainException(
    'NOT_READY',
    'السجل غير جاهز لهذا الإجراء',
    409,
    findings.map((finding) => ({
      field: finding.field ?? 'admission',
      message: finding.message,
    })),
  );
}

function normalizeError(error: unknown): { code: string; message: string } {
  if (error instanceof DomainException)
    return { code: error.code, message: error.message };
  return { code: 'INTERNAL_ERROR', message: 'تعذر تنفيذ الإجراء' };
}

function enrollmentCaller(actorId: string): CallerContext {
  return {
    accountId: actorId,
    displayName: 'Student Management',
    email: '',
    sessionId: '',
    roles: [],
    permissionKeys: [],
    authorizedBranchIds: [],
    organizationWide: true,
    authenticatedAt: new Date().toISOString(),
  };
}
