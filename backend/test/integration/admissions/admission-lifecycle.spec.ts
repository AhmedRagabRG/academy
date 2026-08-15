import '../../../test/load-env';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';
import { AdmissionLifecycleService } from '../../../src/modules/admissions/admissions/admission-lifecycle.service';
import { AdmissionPolicy } from '../../../src/modules/admissions/admissions/admission.policy';
import { AdmissionRepository } from '../../../src/modules/admissions/admissions/admission.repository';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const caller: CallerContext = {
  accountId: '00000000-0000-0000-0000-000000000001',
  displayName: 'Lifecycle Reviewer',
  email: 'reviewer@example.test',
  sessionId: randomUUID(),
  roles: [],
  permissionKeys: [
    'admissions.review',
    'admissions.approve',
    'admissions.reject',
    'admissions.return',
    'admissions.archive',
  ],
  authorizedBranchIds: [],
  organizationWide: true,
  authenticatedAt: new Date().toISOString(),
};

describe('admission lifecycle persistence', () => {
  const repository = new AdmissionRepository(prisma as never);
  const emitted: unknown[] = [];
  const service = new AdmissionLifecycleService(
    repository,
    new AdmissionPolicy(),
    {
      evaluate: jest.fn().mockResolvedValue({ ready: true, findings: [] }),
    } as never,
    { emit: (event: unknown) => emitted.push(event) } as never,
  );

  afterAll(() => prisma.$disconnect());

  it('allows exactly one compare-and-swap winner and appends one immutable history pair', async () => {
    const fixture = await createAdmission();
    const request = {
      admissionId: fixture.id,
      organizationId: fixture.organizationId,
      toStatus: 'archived' as const,
      expectedVersion: 1,
      reason: 'Duplicate application archived',
      caller,
    };
    const attempts = await Promise.allSettled([
      service.transition(request),
      service.transition(request),
    ]);
    expect(
      attempts.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      attempts.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    const [admission, lifecycle, timeline] = await Promise.all([
      prisma.admission.findUniqueOrThrow({ where: { id: fixture.id } }),
      prisma.admissionLifecycleEvent.findMany({
        where: { admissionId: fixture.id },
      }),
      prisma.admissionTimelineEvent.findMany({
        where: { admissionId: fixture.id },
      }),
    ]);
    expect(admission).toMatchObject({
      status: 'ARCHIVED',
      version: 2,
      archiveReason: 'Duplicate application archived',
    });
    expect(lifecycle).toHaveLength(1);
    expect(timeline).toHaveLength(1);
    expect(JSON.stringify(timeline[0]?.metadata)).not.toContain(
      'Duplicate application',
    );
    await expect(
      prisma.admissionLifecycleEvent.update({
        where: { id: lifecycle[0].id },
        data: { reason: 'tampered' },
      }),
    ).rejects.toThrow();
  });

  it('keeps bulk items independent and preserves input ordering', async () => {
    const first = await createAdmission();
    const second = await createAdmission();
    const result = await service.transitionBulk(
      [
        {
          admissionId: first.id,
          toStatus: 'archived',
          expectedVersion: 1,
          reason: 'Valid archive reason',
        },
        {
          admissionId: second.id,
          toStatus: 'archived',
          expectedVersion: 1,
        },
      ],
      first.organizationId,
      caller,
    );
    expect(
      result.map(({ admissionId, success }) => ({ admissionId, success })),
    ).toEqual([
      { admissionId: first.id, success: true },
      { admissionId: second.id, success: false },
    ]);
    await expect(
      prisma.admission.findUniqueOrThrow({ where: { id: second.id } }),
    ).resolves.toMatchObject({ status: 'DRAFT', version: 1 });
  });

  it('allows only one reviewer to acquire a submitted admission', async () => {
    const fixture = await createAdmission('SUBMITTED');
    const secondReviewer = {
      ...caller,
      accountId: '00000000-0000-0000-0000-000000000002',
      displayName: 'Second Reviewer',
    };
    const base = {
      admissionId: fixture.id,
      organizationId: fixture.organizationId,
      toStatus: 'under-review' as const,
      expectedVersion: 1,
    };
    const attempts = await Promise.allSettled([
      service.transition({ ...base, caller }),
      service.transition({ ...base, caller: secondReviewer }),
    ]);
    expect(
      attempts.filter(({ status }) => status === 'fulfilled'),
    ).toHaveLength(1);
    const row = await prisma.admission.findUniqueOrThrow({
      where: { id: fixture.id },
    });
    expect(row.status).toBe('UNDER_REVIEW');
    expect([caller.accountId, secondReviewer.accountId]).toContain(
      row.activeReviewerId,
    );
  });

  it('enforces one approval snapshot per admission at the database boundary', async () => {
    const fixture = await createAdmission();
    const source = await prisma.admission.findFirstOrThrow({
      where: { currentSelectionRevisionId: { not: null } },
      include: { currentSelectionRevision: true },
    });
    const data = {
      admissionId: fixture.id,
      sourceAdmissionVersion: 2,
      selectionRevisionId: source.currentSelectionRevisionId!,
      financialRevisionId: randomUUID(),
      documentPolicySnapshotId: randomUUID(),
      assignmentSnapshot: {},
      applicantSnapshot: {},
      verifiedDocumentVersionIds: [],
      academicTarget: {},
      requiredAmountMinor: 0n,
      currency: 'EGP',
      idempotencyKey: `approval:${fixture.id}`,
      approvedBy: caller.accountId,
    };
    await prisma.admissionApprovalSnapshot.create({ data });
    await expect(
      prisma.admissionApprovalSnapshot.create({
        data: { ...data, idempotencyKey: `approval:${fixture.id}:duplicate` },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});

async function createAdmission(status: 'DRAFT' | 'SUBMITTED' = 'DRAFT') {
  const source = await prisma.admission.findFirstOrThrow();
  return prisma.admission.create({
    data: {
      organizationId: source.organizationId,
      reference: `ADM-TEST-${randomUUID()}`,
      applicantId: source.applicantId,
      status,
      registrationBranchId: source.registrationBranchId,
      registrationBranchLabel: source.registrationBranchLabel,
      studyBranchId: source.studyBranchId,
      studyBranchLabel: source.studyBranchLabel,
      admissionsEmployeeId: source.admissionsEmployeeId,
      admissionsEmployeeLabel: source.admissionsEmployeeLabel,
      customerServiceEmployeeId: source.customerServiceEmployeeId,
      customerServiceEmployeeLabel: source.customerServiceEmployeeLabel,
      customerServiceManagerId: source.customerServiceManagerId,
      customerServiceManagerLabel: source.customerServiceManagerLabel,
      departmentId: source.departmentId,
      departmentLabel: source.departmentLabel,
      leadSourceId: source.leadSourceId,
      leadSourceLabel: source.leadSourceLabel,
      createdBy: caller.accountId,
      updatedBy: caller.accountId,
    },
  });
}
