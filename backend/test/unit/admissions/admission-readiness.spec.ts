import { AdmissionReadinessService } from '../../../src/modules/admissions/readiness/admission-readiness.service';
const offering = {
  id: 'offering-id',
  organizationId: 'organization-id',
  code: 'PRG-1',
  name: 'Program',
  status: 'ACTIVE' as const,
  productType: 'PROFESSIONAL_PROGRAM' as const,
  batchable: true,
};

const batch = {
  id: 'batch-id',
  code: 'B-1',
  name: 'Batch',
  programId: 'offering-id',
  version: 1,
  status: 'REGISTRATION_OPEN' as const,
  archived: false,
};

function aggregate(status = 'DRAFT') {
  return {
    id: 'admission-id',
    status,
    version: 3,
    registrationBranchId: 'registration-branch',
    studyBranchId: 'study-branch',
    admissionsEmployeeId: 'admissions-employee',
    customerServiceEmployeeId: 'service-employee',
    customerServiceManagerId: 'service-manager',
    departmentId: 'department-id',
    leadSourceId: 'lead-source-id',
    currentSelectionRevisionId: 'selection-id',
    currentFinancialRevisionId: 'financial-id',
    currentDocumentPolicySnapshotId: 'policy-id',
    approvalSnapshotId: status === 'APPROVED' ? 'approval-id' : null,
    applicant: {
      status: 'ACTIVE',
      fullName: 'Applicant',
      primaryPhone: '01000000000',
      guardianPhone: null,
      nationalId: '123',
      alternativeIdentityReason: null,
      address: 'Address',
      dateOfBirth: new Date('2000-01-01'),
      qualificationId: 'qualification-id',
      graduationYear: 2020,
    },
    currentSelectionRevision: {
      offeringId: 'offering-id',
      offeringKind: 'PROFESSIONAL_PROGRAM',
      batchId: 'batch-id',
    },
    currentFinancialRevision: {
      productPriceMinor: 10_000n,
      registrationFeesMinor: 1_000n,
      discountAmountMinor: 1_000n,
      requiredAmountMinor: 10_000n,
      currency: 'EGP',
      precision: 2,
    },
    currentDocumentPolicySnapshot: {
      requirements: [
        {
          id: 'requirement-id',
          stableKey: 'national-id',
          required: true,
          requiredAtStage: 'SUBMITTED',
        },
      ],
    },
    documents: [
      {
        requirementKey: 'national-id',
        currentVersion: {
          id: 'version-id',
          status: 'AVAILABLE',
          decisions: [{ decision: 'VERIFIED', decidedAt: new Date() }],
        },
      },
    ],
  };
}

describe('AdmissionReadinessService', () => {
  function service(row: ReturnType<typeof aggregate>) {
    return new AdmissionReadinessService(
      { findAggregate: jest.fn().mockResolvedValue(row) },
      {
        resolve: jest.fn().mockResolvedValue(offering),
        eligibility: jest
          .fn()
          .mockResolvedValue({ eligible: true, reasons: [] }),
      } as never,
      {
        resolveHistorical: jest.fn().mockResolvedValue(batch),
        eligibility: jest.fn().mockResolvedValue({
          eligible: true,
          reasons: [],
          availableSeats: 5,
          financialRevisionId: 'financial-id',
          batchVersion: 1,
        }),
      } as never,
    );
  }

  it('uses one complete evaluator for submit readiness', async () => {
    await expect(
      service(aggregate()).evaluate(
        'admission-id',
        'organization-id',
        'submit',
      ),
    ).resolves.toEqual({
      ready: true,
      action: 'submit',
      admissionVersion: 3,
      findings: [],
    });
  });

  it('aggregates workflow, identity, academic, finance, and document findings', async () => {
    const row = aggregate('SUBMITTED');
    row.applicant.nationalId = '';
    row.currentFinancialRevision.requiredAmountMinor = 999n;
    row.documents[0].currentVersion.decisions = [];
    row.registrationBranchId = 'wrong-branch';
    const result = await service(row).evaluate(
      'admission-id',
      'organization-id',
      'approve',
    );
    expect(result.ready).toBe(false);
    expect(result.findings.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'invalid-status',
        'identity-required',
        'financial-calculation-invalid',
        'document-not-verified',
      ]),
    );
  });

  it('re-evaluates live batch capacity instead of trusting the draft snapshot', async () => {
    const catalog = { resolve: jest.fn().mockResolvedValue(offering) };
    const batches = {
      resolveHistorical: jest.fn().mockResolvedValue(batch),
      eligibility: jest.fn().mockResolvedValue({
        eligible: false,
        reasons: ['batch-full'],
        availableSeats: 0,
        financialRevisionId: 'financial-id',
        batchVersion: 1,
      }),
    };
    const subject = new AdmissionReadinessService(
      { findAggregate: jest.fn().mockResolvedValue(aggregate()) },
      catalog as never,
      batches as never,
    );
    const result = await subject.evaluate(
      'admission-id',
      'organization-id',
      'submit',
    );
    expect(result.findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'batch-full' })]),
    );
  });
});
