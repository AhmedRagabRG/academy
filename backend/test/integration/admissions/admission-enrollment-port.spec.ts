import '../../../test/load-env';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';
import { AdmissionLifecycleService } from '../../../src/modules/admissions/admissions/admission-lifecycle.service';
import { AdmissionPolicy } from '../../../src/modules/admissions/admissions/admission.policy';
import { AdmissionRepository } from '../../../src/modules/admissions/admissions/admission.repository';
import {
  ADMISSIONS_ENROLLMENT_PORT,
  type AdmissionsEnrollmentPort,
} from '../../../src/modules/admissions/types/admissions-enrollment.port';
import { AdmissionsModule } from '../../../src/modules/admissions/admissions.module';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

describe('Admissions enrollment port', () => {
  const repository = new AdmissionRepository(prisma as never);
  const service = new AdmissionLifecycleService(
    repository,
    new AdmissionPolicy(),
    {
      evaluate: jest.fn().mockResolvedValue({ ready: true, findings: [] }),
    } as never,
    { emit: jest.fn() } as never,
  );

  afterAll(() => prisma.$disconnect());

  it('exports only the bounded enrollment token and contract', () => {
    const exports = Reflect.getMetadata(
      'exports',
      AdmissionsModule,
    ) as unknown[];
    expect(exports).toContain(ADMISSIONS_ENROLLMENT_PORT);
    expect(exports).not.toContain(AdmissionRepository);
    const contract: Pick<AdmissionsEnrollmentPort, 'acknowledgeEnrollment'> = {
      acknowledgeEnrollment: jest.fn(),
    };
    expect(contract).toHaveProperty('acknowledgeEnrollment');
  });

  it('atomically enrolls once, makes the same reference idempotent, and rejects another reference', async () => {
    const source = await prisma.admission.findFirstOrThrow();
    const admission = await prisma.admission.create({
      data: {
        organizationId: source.organizationId,
        reference: `ADM-ENROLL-${randomUUID()}`,
        applicantId: source.applicantId,
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
        createdBy: source.createdBy,
        updatedBy: source.updatedBy,
      },
    });
    const snapshot = await prisma.admissionApprovalSnapshot.create({
      data: {
        admissionId: admission.id,
        sourceAdmissionVersion: 1,
        selectionRevisionId: randomUUID(),
        financialRevisionId: randomUUID(),
        documentPolicySnapshotId: randomUUID(),
        assignmentSnapshot: {},
        applicantSnapshot: {},
        verifiedDocumentVersionIds: [],
        academicTarget: {},
        requiredAmountMinor: 0n,
        currency: 'EGP',
        idempotencyKey: `approval:${admission.id}`,
        approvedBy: source.createdBy,
      },
    });
    await prisma.admission.update({
      where: { id: admission.id },
      data: { status: 'APPROVED', approvalSnapshotId: snapshot.id },
    });
    const input = {
      admissionId: admission.id,
      organizationId: admission.organizationId,
      approvalSnapshotId: snapshot.id,
      externalStudentReference: `STU-${randomUUID()}`,
      expectedVersion: 1,
      actorId: source.createdBy,
    };
    await expect(service.acknowledgeEnrollment(input)).resolves.toMatchObject({
      status: 'enrolled',
      version: 2,
    });
    await expect(service.acknowledgeEnrollment(input)).resolves.toMatchObject({
      status: 'enrolled',
      version: 2,
    });
    await expect(
      service.acknowledgeEnrollment({
        ...input,
        externalStudentReference: `STU-${randomUUID()}`,
      }),
    ).rejects.toMatchObject({ code: 'ENROLLMENT_CONFLICT' });
    const [lifecycleCount, timelineCount] = await Promise.all([
      prisma.admissionLifecycleEvent.count({
        where: { admissionId: admission.id },
      }),
      prisma.admissionTimelineEvent.count({
        where: { admissionId: admission.id },
      }),
    ]);
    expect({ lifecycleCount, timelineCount }).toEqual({
      lifecycleCount: 1,
      timelineCount: 1,
    });
  });
});
