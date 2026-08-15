import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '../../../core/exceptions/domain.exception';
import { AdmissionLifecycleService } from '../admissions/admission-lifecycle.service';
import { AdmissionRepository } from '../admissions/admission.repository';
import {
  type AdmissionsEnrollmentPort,
  type ApprovalFinancialSnapshot,
  type EnrollmentHandoff,
  type EnrollmentReadinessResult,
} from '../types/admissions-enrollment.port';
import {
  ADMISSIONS_ORGANIZATION_PORT,
  type AdmissionsOrganizationPort,
} from '../types/admissions-reference.port';
import type { OfferingKind } from '../types/admissions.types';
import { AdmissionReadinessService } from './admission-readiness.service';

interface EnrollmentAggregate {
  id: string;
  reference: string;
  version: number;
  status: string;
  registrationBranchId: string;
  studyBranchId: string;
  departmentId: string;
  customerServiceEmployeeId: string;
  approvalSnapshotId: string | null;
  approvalSnapshot: {
    id: string;
    applicantSnapshot: unknown;
    academicTarget: unknown;
    documentPolicySnapshotId: string;
    verifiedDocumentVersionIds: string[];
    financialRevisionId: string;
    currency: string;
    requiredAmountMinor: bigint;
  } | null;
  currentFinancialRevision: { precision: number } | null;
}

interface EnrollmentRepository {
  findAggregate(
    id: string,
    organizationId: string,
  ): Promise<EnrollmentAggregate | null>;
  findApprovalFinancialSnapshot(approvalSnapshotId: string): Promise<{
    id: string;
    admissionId: string;
    financialRevisionId: string;
    requiredAmountMinor: bigint;
    currency: string;
  } | null>;
  findFinancialRevision(financialRevisionId: string): Promise<{
    id: string;
    productPriceMinor: bigint;
    registrationFeesMinor: bigint;
    discountAmountMinor: bigint;
    requiredAmountMinor: bigint;
    currency: string;
    precision: number;
  } | null>;
}

@Injectable()
export class AdmissionsEnrollmentService implements AdmissionsEnrollmentPort {
  constructor(
    @Inject(AdmissionRepository)
    private readonly repository: EnrollmentRepository,
    @Inject(ADMISSIONS_ORGANIZATION_PORT)
    private readonly organization: AdmissionsOrganizationPort,
    private readonly readiness: AdmissionReadinessService,
    private readonly lifecycle: AdmissionLifecycleService,
  ) {}

  async getEnrollmentReadiness(
    admissionId: string,
  ): Promise<EnrollmentReadinessResult> {
    const organizationId = await this.organization.organizationId();
    const aggregate = await this.repository.findAggregate(
      admissionId,
      organizationId,
    );
    if (!aggregate) throw new NotFoundException();
    const result = await this.readiness.evaluate(
      admissionId,
      organizationId,
      'enroll',
    );
    if (!result.ready) return { ready: false, findings: result.findings };
    const snapshot = aggregate.approvalSnapshot;
    if (!snapshot || !aggregate.currentFinancialRevision)
      return {
        ready: false,
        findings: [
          {
            code: 'approval-snapshot-missing',
            section: 'workflow',
            field: 'approvalSnapshotId',
            message: 'approval-snapshot-missing',
          },
        ],
      };
    return {
      ready: true,
      handoff: this.toHandoff(aggregate, snapshot),
    };
  }

  /**
   * Settled financial facts for an already-approved admission. Student Finance
   * copies these once into its own immutable per-enrollment snapshot, so a
   * later catalog or batch price change cannot reach an existing account.
   */
  async getApprovalFinancialSnapshot(
    approvalSnapshotId: string,
  ): Promise<ApprovalFinancialSnapshot | null> {
    const snapshot =
      await this.repository.findApprovalFinancialSnapshot(approvalSnapshotId);
    if (!snapshot) return null;
    const revision = await this.repository.findFinancialRevision(
      snapshot.financialRevisionId,
    );
    if (!revision) return null;
    return {
      approvalSnapshotId: snapshot.id,
      admissionId: snapshot.admissionId,
      financialRevisionId: revision.id,
      productPriceMinor: revision.productPriceMinor.toString(),
      registrationFeesMinor: revision.registrationFeesMinor.toString(),
      discountAmountMinor: revision.discountAmountMinor.toString(),
      // The approval snapshot is authoritative for what was actually owed.
      requiredAmountMinor: snapshot.requiredAmountMinor.toString(),
      currency: snapshot.currency,
      precision: revision.precision,
    };
  }

  async acknowledgeEnrollment(input: {
    admissionId: string;
    approvalSnapshotId: string;
    externalStudentReference: string;
    expectedVersion: number;
  }): Promise<{ admissionId: string; status: 'enrolled'; version: number }> {
    const organizationId = await this.organization.organizationId();
    return this.lifecycle.acknowledgeEnrollment({
      ...input,
      organizationId,
      actorId: '00000000-0000-0000-0000-000000000000',
    });
  }

  private toHandoff(
    admission: EnrollmentAggregate,
    snapshot: NonNullable<EnrollmentAggregate['approvalSnapshot']>,
  ): EnrollmentHandoff {
    const applicant = object(snapshot.applicantSnapshot);
    const academic = object(snapshot.academicTarget);
    return {
      admissionId: admission.id,
      admissionReference: admission.reference,
      admissionVersion: admission.version,
      approvalSnapshotId: snapshot.id,
      applicant: {
        applicantId: requiredString(applicant, 'applicantId'),
        fullName: requiredString(applicant, 'fullName'),
        dateOfBirth: requiredString(applicant, 'dateOfBirth'),
        qualificationId: requiredString(applicant, 'qualificationId'),
        // Snapshots written before the identity block was pinned fall back to
        // empty/zero rather than throwing, so an older approved admission
        // still reports readiness; the consumer validates before persisting.
        qualificationLabel:
          optionalString(applicant, 'qualificationLabel') ?? '',
        primaryPhone: optionalString(applicant, 'primaryPhone') ?? '',
        ...propertyIfString(applicant, 'guardianPhone'),
        ...propertyIfString(applicant, 'nationalId'),
        ...propertyIfString(applicant, 'alternativeIdentityReason'),
        address: optionalString(applicant, 'address') ?? '',
        graduationYear: optionalNumber(applicant, 'graduationYear') ?? 0,
      },
      academic: {
        offeringKind: offeringKind(requiredString(academic, 'offeringKind')),
        offeringId: requiredString(academic, 'offeringId'),
        offeringVersion: requiredNumber(academic, 'offeringVersion'),
        ...optionalStringProperty(academic, 'batchId'),
        ...optionalNumberProperty(academic, 'batchVersion'),
      },
      registrationBranchId: admission.registrationBranchId,
      studyBranchId: admission.studyBranchId,
      departmentId: admission.departmentId,
      customerServiceEmployeeId: admission.customerServiceEmployeeId,
      documentPolicySnapshotId: snapshot.documentPolicySnapshotId,
      verifiedDocumentVersionIds: [...snapshot.verifiedDocumentVersionIds],
      financialRevisionId: snapshot.financialRevisionId,
      currency: snapshot.currency,
      precision: admission.currentFinancialRevision?.precision ?? 0,
      requiredAmountMinor: snapshot.requiredAmountMinor.toString(),
    };
  }
}

function object(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Invalid immutable approval snapshot');
  return value as Readonly<Record<string, unknown>>;
}

function requiredString(
  value: Readonly<Record<string, unknown>>,
  key: string,
): string {
  const candidate = value[key];
  if (typeof candidate !== 'string' || !candidate)
    throw new Error(`Invalid approval snapshot field: ${key}`);
  return candidate;
}

function requiredNumber(
  value: Readonly<Record<string, unknown>>,
  key: string,
): number {
  const candidate = value[key];
  if (typeof candidate !== 'number' || !Number.isInteger(candidate))
    throw new Error(`Invalid approval snapshot field: ${key}`);
  return candidate;
}

function optionalString(
  value: Readonly<Record<string, unknown>>,
  key: string,
): string | undefined {
  const candidate = value[key];
  return typeof candidate === 'string' && candidate ? candidate : undefined;
}

function optionalNumber(
  value: Readonly<Record<string, unknown>>,
  key: string,
): number | undefined {
  const candidate = value[key];
  return typeof candidate === 'number' && Number.isInteger(candidate)
    ? candidate
    : undefined;
}

/** Emits the key only when present, so `exactOptionalPropertyTypes` holds. */
function propertyIfString<K extends string>(
  value: Readonly<Record<string, unknown>>,
  key: K,
): Partial<Record<K, string>> {
  const candidate = optionalString(value, key);
  return candidate ? ({ [key]: candidate } as Record<K, string>) : {};
}

function optionalStringProperty(
  value: Readonly<Record<string, unknown>>,
  key: 'batchId',
): { batchId?: string } {
  const candidate = value[key];
  return typeof candidate === 'string' ? { batchId: candidate } : {};
}

function optionalNumberProperty(
  value: Readonly<Record<string, unknown>>,
  key: 'batchVersion',
): { batchVersion?: number } {
  const candidate = value[key];
  return typeof candidate === 'number' && Number.isInteger(candidate)
    ? { batchVersion: candidate }
    : {};
}

function offeringKind(value: string): OfferingKind {
  const normalized = value.toLowerCase().replaceAll('_', '-');
  if (
    normalized === 'professional-program' ||
    normalized === 'professional-diploma' ||
    normalized === 'training-course'
  )
    return normalized;
  throw new Error('Invalid approval snapshot offering kind');
}
