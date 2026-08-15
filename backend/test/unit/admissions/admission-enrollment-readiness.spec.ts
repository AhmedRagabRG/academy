import { AdmissionsEnrollmentService } from '../../../src/modules/admissions/readiness/admissions-enrollment.service';

describe('AdmissionsEnrollmentService', () => {
  const aggregate = {
    id: 'admission-id',
    reference: 'ADM-2026-00001',
    version: 8,
    status: 'APPROVED',
    registrationBranchId: 'registration-branch',
    studyBranchId: 'study-branch',
    departmentId: 'department',
    customerServiceEmployeeId: 'customer-service',
    approvalSnapshotId: 'approval-id',
    approvalSnapshot: {
      id: 'approval-id',
      applicantSnapshot: {
        applicantId: 'applicant-id',
        fullName: 'Applicant',
        dateOfBirth: '2000-01-01',
        qualificationId: 'qualification-id',
      },
      academicTarget: {
        offeringKind: 'PROFESSIONAL_PROGRAM',
        offeringId: 'offering-id',
        offeringVersion: 3,
        batchId: 'batch-id',
        batchVersion: 2,
      },
      documentPolicySnapshotId: 'policy-id',
      verifiedDocumentVersionIds: ['document-version-id'],
      financialRevisionId: 'financial-id',
      currency: 'EGP',
      requiredAmountMinor: 12500n,
    },
    currentFinancialRevision: { precision: 2 },
  };

  it('projects the immutable approval snapshot when enrollment is ready', async () => {
    const service = new AdmissionsEnrollmentService(
      { findAggregate: jest.fn().mockResolvedValue(aggregate) } as never,
      {
        organizationId: jest.fn().mockResolvedValue('organization-id'),
      } as never,
      {
        evaluate: jest.fn().mockResolvedValue({ ready: true, findings: [] }),
      } as never,
      {} as never,
    );
    const result = await service.getEnrollmentReadiness('admission-id');
    expect(result.ready).toBe(true);
    if (!result.ready) throw new Error('Expected ready enrollment handoff');
    expect(result.handoff.approvalSnapshotId).toBe('approval-id');
    expect(result.handoff.requiredAmountMinor).toBe('12500');
    expect(result.handoff.precision).toBe(2);
    expect(result.handoff.academic.offeringKind).toBe('professional-program');
  });

  it('returns every readiness finding without exposing a partial handoff', async () => {
    const findings = [
      {
        code: 'document-missing',
        section: 'documents',
        message: 'document-missing',
      },
    ];
    const service = new AdmissionsEnrollmentService(
      { findAggregate: jest.fn().mockResolvedValue(aggregate) } as never,
      {
        organizationId: jest.fn().mockResolvedValue('organization-id'),
      } as never,
      {
        evaluate: jest.fn().mockResolvedValue({ ready: false, findings }),
      } as never,
      {} as never,
    );
    await expect(
      service.getEnrollmentReadiness('admission-id'),
    ).resolves.toEqual({
      ready: false,
      findings,
    });
  });

  it('delegates acknowledgement to the atomic lifecycle boundary', async () => {
    const acknowledgeEnrollment = jest.fn().mockResolvedValue({
      admissionId: 'admission-id',
      status: 'enrolled',
      version: 9,
    });
    const service = new AdmissionsEnrollmentService(
      {} as never,
      {
        organizationId: jest.fn().mockResolvedValue('organization-id'),
      } as never,
      {} as never,
      { acknowledgeEnrollment } as never,
    );
    await service.acknowledgeEnrollment({
      admissionId: 'admission-id',
      approvalSnapshotId: 'approval-id',
      externalStudentReference: 'STU-1',
      expectedVersion: 8,
    });
    expect(acknowledgeEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'organization-id',
        externalStudentReference: 'STU-1',
      }),
    );
  });
});
