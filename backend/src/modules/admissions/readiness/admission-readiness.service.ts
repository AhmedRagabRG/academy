import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '../../../core/exceptions/domain.exception';
import { AdmissionRepository } from '../admissions/admission.repository';
import {
  CATALOG_PUBLIC_PORT,
  type CatalogPublicPort,
} from '../../catalog/types/catalog-public.port';
import {
  PROGRAM_BATCHES_PUBLIC_PORT,
  type ProgramBatchesPublicPort,
} from '../../program-batches/types/program-batches-public.port';
import type {
  AdmissionFinding,
  AdmissionReadiness,
} from '../types/admissions.types';

type ReadinessAction = 'submit' | 'approve' | 'enroll';

interface ReadinessAggregate {
  id: string;
  status: string;
  version: number;
  registrationBranchId: string;
  studyBranchId: string;
  admissionsEmployeeId: string;
  customerServiceEmployeeId: string;
  customerServiceManagerId: string;
  departmentId: string;
  leadSourceId: string;
  currentSelectionRevisionId: string | null;
  currentFinancialRevisionId: string | null;
  currentDocumentPolicySnapshotId: string | null;
  approvalSnapshotId: string | null;
  applicant: {
    status: string;
    fullName: string;
    primaryPhone: string;
    guardianPhone: string | null;
    nationalId: string | null;
    alternativeIdentityReason: string | null;
    address: string;
    dateOfBirth: Date;
    qualificationId: string;
    graduationYear: number;
  };
  currentSelectionRevision: {
    offeringId: string;
    offeringKind: string;
    batchId: string | null;
  } | null;
  currentFinancialRevision: {
    productPriceMinor: bigint;
    registrationFeesMinor: bigint;
    discountAmountMinor: bigint;
    requiredAmountMinor: bigint;
    currency: string;
    precision: number;
  } | null;
  currentDocumentPolicySnapshot: {
    requirements: Array<{
      id: string;
      stableKey: string;
      required: boolean;
      requiredAtStage: string;
    }>;
  } | null;
  documents: Array<{
    requirementKey: string;
    currentVersion: {
      id: string;
      status: string;
      decisions: Array<{ decision: string; decidedAt: Date }>;
    } | null;
  }>;
}

interface ReadinessRepository {
  findAggregate(
    id: string,
    organizationId: string,
  ): Promise<ReadinessAggregate | null>;
}

const REQUIRED_STAGE_RANK: Readonly<Record<string, number>> = {
  DRAFT: 0,
  SUBMITTED: 1,
  UNDER_REVIEW: 2,
  APPROVED: 3,
  ENROLLED: 4,
};

@Injectable()
export class AdmissionReadinessService {
  constructor(
    @Inject(AdmissionRepository)
    private readonly repository: ReadinessRepository,
    @Inject(CATALOG_PUBLIC_PORT)
    private readonly catalog: CatalogPublicPort,
    @Inject(PROGRAM_BATCHES_PUBLIC_PORT)
    private readonly batches: ProgramBatchesPublicPort,
  ) {}

  async evaluate(
    admissionId: string,
    organizationId: string,
    action: ReadinessAction,
  ): Promise<AdmissionReadiness> {
    const admission = await this.repository.findAggregate(
      admissionId,
      organizationId,
    );
    if (!admission) throw new NotFoundException();
    return this.evaluateAggregate(admission, action);
  }

  async evaluateAggregate(
    admission: ReadinessAggregate,
    action: ReadinessAction,
  ): Promise<AdmissionReadiness> {
    const findings: AdmissionFinding[] = [];
    this.checkWorkflow(admission, action, findings);
    this.checkApplicant(admission, findings);
    this.checkAssignments(admission, findings);
    await this.checkLiveSelection(admission, findings);
    this.checkFinancial(admission, findings);
    this.checkDocuments(admission, action, findings);
    return {
      ready: findings.length === 0,
      action,
      admissionVersion: admission.version,
      findings,
    };
  }

  private checkWorkflow(
    admission: ReadinessAggregate,
    action: ReadinessAction,
    findings: AdmissionFinding[],
  ): void {
    const requiredStatus =
      action === 'submit'
        ? 'DRAFT'
        : action === 'approve'
          ? 'UNDER_REVIEW'
          : 'APPROVED';
    if (admission.status !== requiredStatus)
      findings.push(finding('workflow', 'invalid-status', 'status'));
    if (action === 'enroll' && !admission.approvalSnapshotId)
      findings.push(
        finding('workflow', 'approval-snapshot-missing', 'approvalSnapshotId'),
      );
  }

  private checkApplicant(
    admission: ReadinessAggregate,
    findings: AdmissionFinding[],
  ): void {
    const applicant = admission.applicant;
    if (applicant.status !== 'ACTIVE')
      findings.push(finding('applicant', 'applicant-inactive'));
    const required: Array<[keyof typeof applicant, string]> = [
      ['fullName', 'fullName'],
      ['primaryPhone', 'primaryPhone'],
      ['address', 'address'],
      ['dateOfBirth', 'dateOfBirth'],
      ['qualificationId', 'qualificationId'],
      ['graduationYear', 'graduationYear'],
    ];
    for (const [key, field] of required)
      if (!applicant[key])
        findings.push(finding('applicant', 'required', field));
    if (!applicant.nationalId && !applicant.alternativeIdentityReason)
      findings.push(finding('applicant', 'identity-required', 'nationalId'));
  }

  private checkAssignments(
    admission: ReadinessAggregate,
    findings: AdmissionFinding[],
  ): void {
    const fields = [
      'registrationBranchId',
      'studyBranchId',
      'admissionsEmployeeId',
      'customerServiceEmployeeId',
      'customerServiceManagerId',
      'departmentId',
      'leadSourceId',
    ] as const;
    for (const field of fields)
      if (!admission[field])
        findings.push(finding('assignment', 'required', field));
  }

  private async checkLiveSelection(
    admission: ReadinessAggregate,
    findings: AdmissionFinding[],
  ): Promise<void> {
    const selection = admission.currentSelectionRevision;
    if (!selection || !admission.currentSelectionRevisionId) {
      findings.push(finding('academic', 'selection-missing'));
      return;
    }
    const offering = await this.catalog.resolve(selection.offeringId);
    if (!offering) {
      findings.push(finding('academic', 'offering-not-found', 'offeringId'));
      return;
    }
    if (offering.status !== 'ACTIVE')
      findings.push(finding('academic', 'offering-inactive', 'offeringId'));
    const program = offering.productType === 'PROFESSIONAL_PROGRAM';
    if (program && !selection.batchId)
      findings.push(finding('academic', 'batch-required', 'batchId'));
    if (!program && selection.batchId)
      findings.push(finding('academic', 'batch-forbidden', 'batchId'));
    if (selection.batchId) {
      const batch = await this.batches.resolveHistorical(selection.batchId);
      if (!batch)
        findings.push(finding('academic', 'batch-not-found', 'batchId'));
      else if (batch.programId !== offering.id)
        findings.push(finding('academic', 'batch-parent-mismatch', 'batchId'));
      else {
        const eligibility = await this.batches.eligibility(
          selection.batchId,
          admission.registrationBranchId,
          new Date().toISOString().slice(0, 10),
        );
        for (const code of eligibility.reasons)
          findings.push(finding('academic', code));
      }
    } else {
      const eligibility = await this.catalog.eligibility(
        offering.id,
        admission.registrationBranchId,
      );
      for (const code of eligibility.reasons)
        findings.push(finding('academic', code));
    }
  }

  private checkFinancial(
    admission: ReadinessAggregate,
    findings: AdmissionFinding[],
  ): void {
    const financial = admission.currentFinancialRevision;
    if (!financial || !admission.currentFinancialRevisionId) {
      findings.push(finding('financial', 'financial-snapshot-missing'));
      return;
    }
    if (!financial.currency || financial.precision < 0)
      findings.push(finding('financial', 'financial-currency-invalid'));
    const expected =
      financial.productPriceMinor +
      financial.registrationFeesMinor -
      financial.discountAmountMinor;
    if (financial.requiredAmountMinor !== (expected > 0n ? expected : 0n))
      findings.push(finding('financial', 'financial-calculation-invalid'));
  }

  private checkDocuments(
    admission: ReadinessAggregate,
    action: ReadinessAction,
    findings: AdmissionFinding[],
  ): void {
    const policy = admission.currentDocumentPolicySnapshot;
    if (!policy || !admission.currentDocumentPolicySnapshotId) {
      findings.push(finding('documents', 'document-policy-missing'));
      return;
    }
    const targetRank = action === 'submit' ? 1 : action === 'approve' ? 3 : 4;
    const documents = new Map(
      admission.documents.map((document) => [
        document.requirementKey,
        document,
      ]),
    );
    for (const requirement of policy.requirements) {
      if (!requirement.required) continue;
      if ((REQUIRED_STAGE_RANK[requirement.requiredAtStage] ?? 99) > targetRank)
        continue;
      const current = documents.get(requirement.stableKey)?.currentVersion;
      const latestDecision = current?.decisions.at(-1)?.decision;
      if (!current || current.status !== 'AVAILABLE')
        findings.push(
          finding('documents', 'document-missing', requirement.stableKey),
        );
      else if (latestDecision !== 'VERIFIED')
        findings.push(
          finding('documents', 'document-not-verified', requirement.stableKey),
        );
    }
  }
}

function finding(
  section: AdmissionFinding['section'],
  code: string,
  field?: string,
): AdmissionFinding {
  return { section, code, field, message: code };
}
