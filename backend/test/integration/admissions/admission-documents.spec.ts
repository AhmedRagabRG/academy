import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../../prisma/generated/client';
import type { PrismaService } from '../../../src/database/prisma.service';
import { PrismaAdmissionDocumentRepository } from '../../../src/modules/admissions/documents/admission-document.repository';
import { AdmissionDocumentService } from '../../../src/modules/admissions/documents/admission-document.service';
import { EMPTY_CALLER_CONTEXT } from '../../../src/shared/types/caller-context';
import type { StorageService } from '../../../src/storage/storage.service.interface';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const repository = new PrismaAdmissionDocumentRepository(
  prisma as unknown as PrismaService,
);

describe('Admission document persistence', () => {
  let admissionId: string;
  let actorId: string;
  let requirementId: string;
  let documentId: string;

  beforeAll(async () => {
    const seeded = await prisma.admission.findFirst({
      include: { applicant: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!seeded) throw new Error('Seeded admission is required');
    actorId = seeded.createdBy;
    admissionId = randomUUID();
    const applicantId = randomUUID();
    await prisma.applicant.create({
      data: {
        id: applicantId,
        organizationId: seeded.organizationId,
        fullName: 'Document Integration Applicant',
        normalizedFullName: `document integration ${applicantId}`,
        primaryPhone: `010${Date.now().toString().slice(-8)}`,
        normalizedPrimaryPhone: `010${Date.now().toString().slice(-8)}`,
        alternativeIdentityReason: 'Integration fixture',
        address: 'Cairo',
        dateOfBirth: new Date('2000-01-01'),
        qualificationId: seeded.applicant.qualificationId,
        qualificationLabel: seeded.applicant.qualificationLabel,
        graduationYear: 2020,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    await prisma.admission.create({
      data: {
        id: admissionId,
        organizationId: seeded.organizationId,
        reference: `ADM-DOC-${randomUUID().slice(0, 8)}`,
        applicantId,
        registrationBranchId: seeded.registrationBranchId,
        registrationBranchLabel: seeded.registrationBranchLabel,
        studyBranchId: seeded.studyBranchId,
        studyBranchLabel: seeded.studyBranchLabel,
        admissionsEmployeeId: seeded.admissionsEmployeeId,
        admissionsEmployeeLabel: seeded.admissionsEmployeeLabel,
        customerServiceEmployeeId: seeded.customerServiceEmployeeId,
        customerServiceEmployeeLabel: seeded.customerServiceEmployeeLabel,
        customerServiceManagerId: seeded.customerServiceManagerId,
        customerServiceManagerLabel: seeded.customerServiceManagerLabel,
        departmentId: seeded.departmentId,
        departmentLabel: seeded.departmentLabel,
        leadSourceId: seeded.leadSourceId,
        leadSourceLabel: seeded.leadSourceLabel,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    const snapshot = await prisma.admissionDocumentPolicySnapshot.create({
      data: {
        admissionId,
        sourcePolicyId: randomUUID(),
        sourcePolicyVersion: 1,
        snapshotVersion: 1,
        createdBy: actorId,
        requirements: {
          create: {
            stableKey: 'national-id',
            label: 'National ID',
            required: true,
            requiredAtStage: 'SUBMITTED',
            allowedMimeTypes: ['application/pdf'],
            maximumBytes: 1_000_000,
            sourceRequirementId: randomUUID(),
          },
        },
      },
      include: { requirements: true },
    });
    requirementId = snapshot.requirements[0].id;
    const document = await prisma.admissionDocument.create({
      data: {
        admissionId,
        requirementKey: 'national-id',
        currentRequirementId: requirementId,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    documentId = document.id;
    await prisma.admission.update({
      where: { id: admissionId },
      data: { currentDocumentPolicySnapshotId: snapshot.id },
    });
  });

  afterAll(async () => prisma.$disconnect());

  it('persists one current immutable version and replays its durable key', async () => {
    const command = {
      admissionId,
      documentId,
      requirementId,
      expectedVersion: 1,
      idempotencyKey: 'integration-upload-key',
      storageFile: {
        id: randomUUID(),
        fileName: 'national-id.pdf',
        originalName: 'national-id.pdf',
        mimeType: 'application/pdf',
        size: 400,
        url: '/files/national-id.pdf',
      },
      actorId,
    };
    const stored = await repository.storeVersion(command);
    expect(stored.currentVersion?.versionNumber).toBe(1);
    expect(stored.state).toBe('pending');
    const replay = await repository.findByIdempotencyKey(
      admissionId,
      command.idempotencyKey,
    );
    expect(replay?.id).toBe(stored.currentVersion?.id);
    expect(
      await prisma.admissionDocumentVersion.count({ where: { documentId } }),
    ).toBe(1);
  });

  it('appends decisions and derives rejected then verified state', async () => {
    const version = await repository.findByIdempotencyKey(
      admissionId,
      'integration-upload-key',
    );
    if (!version) throw new Error('Uploaded version is required');
    const rejected = await repository.decide({
      admissionId,
      documentId,
      versionId: version.id,
      expectedVersion: 2,
      decision: 'rejected',
      reason: 'Unreadable scan',
      reviewerId: actorId,
      reviewerName: 'Integration Reviewer',
    });
    expect(rejected.state).toBe('rejected');
    const verified = await repository.decide({
      admissionId,
      documentId,
      versionId: version.id,
      expectedVersion: 3,
      decision: 'verified',
      reviewerId: actorId,
      reviewerName: 'Integration Reviewer',
    });
    expect(verified.state).toBe('verified');
    expect(
      (await repository.versions(admissionId, documentId))[0].decisions,
    ).toHaveLength(2);
  });

  it('database triggers reject direct decision mutation and deletion', async () => {
    const decision = await prisma.admissionDocumentDecision.findFirstOrThrow({
      where: { documentVersion: { documentId } },
    });
    await expect(
      prisma.admissionDocumentDecision.update({
        where: { id: decision.id },
        data: { reason: 'tampered' },
      }),
    ).rejects.toThrow(/append-only/);
    await expect(
      prisma.admissionDocumentDecision.delete({ where: { id: decision.id } }),
    ).rejects.toThrow(/append-only/);
  });

  it('refreshes by stable key, retains satisfying evidence, and adds requirements', async () => {
    const refreshed = await repository.refreshPolicy({
      admissionId,
      expectedVersion: 4,
      sourcePolicyId: randomUUID(),
      sourcePolicyVersion: 2,
      actorId,
      requirements: [
        {
          id: randomUUID(),
          stableKey: 'national-id',
          required: true,
          allowedMimeTypes: ['application/pdf'],
          maximumBytes: 1_000_000,
        },
        {
          id: randomUUID(),
          stableKey: 'qualification',
          required: true,
          allowedMimeTypes: ['application/pdf', 'image/jpeg'],
          maximumBytes: 1_000_000,
        },
      ],
    });
    expect(refreshed.map((item) => item.requirementKey)).toEqual([
      'national-id',
      'qualification',
    ]);
    expect(
      refreshed.find((item) => item.requirementKey === 'national-id')
        ?.currentVersion,
    ).not.toBeNull();
    expect(
      refreshed.find((item) => item.requirementKey === 'qualification')?.state,
    ).toBe('missing');
  });

  it('withdraws without deleting version or decision evidence', async () => {
    const version = await repository.findByIdempotencyKey(
      admissionId,
      'integration-upload-key',
    );
    if (!version) throw new Error('Uploaded version is required');
    const withdrawn = await repository.withdraw({
      admissionId,
      documentId,
      versionId: version.id,
      expectedVersion: 5,
      reason: 'Superseded',
      actorId,
    });
    expect(withdrawn.state).toBe('withdrawn');
    const history = await repository.versions(admissionId, documentId);
    expect(history).toHaveLength(1);
    expect(history[0].decisions).toHaveLength(2);
  });

  it('allows only one concurrent current-version writer', async () => {
    const current = await prisma.admissionDocument.findUniqueOrThrow({
      where: { id: documentId },
      select: { currentRequirementId: true },
    });
    const command = (key: string) => ({
      admissionId,
      documentId,
      requirementId: current.currentRequirementId,
      expectedVersion: 6,
      idempotencyKey: key,
      storageFile: {
        id: randomUUID(),
        fileName: `${key}.pdf`,
        originalName: `${key}.pdf`,
        mimeType: 'application/pdf',
        size: 100,
        url: `/files/${key}.pdf`,
      },
      actorId,
    });
    const results = await Promise.allSettled([
      repository.storeVersion(command('race-left')),
      repository.storeVersion(command('race-right')),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(await repository.versions(admissionId, documentId)).toHaveLength(2);
  });

  it('compensates storage when a stale metadata transaction fails', async () => {
    const storage: jest.Mocked<StorageService> = {
      store: jest.fn().mockResolvedValue({
        id: 'compensation-file',
        fileName: 'compensation-file.pdf',
        originalName: 'compensation.pdf',
        mimeType: 'application/pdf',
        size: 4,
        url: '/files/compensation-file.pdf',
      }),
      retrieve: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
      publicUrl: jest.fn((id: string, _mimeType: string) => `/files/${id}.pdf`),
    };
    const service = new AdmissionDocumentService(repository, storage);
    await expect(
      service.replace(
        admissionId,
        documentId,
        { idempotencyKey: 'compensation-key', expectedVersion: 1 },
        {
          originalname: 'compensation.pdf',
          mimetype: 'application/pdf',
          size: 4,
          buffer: Buffer.from('%PDF'),
        },
        { ...EMPTY_CALLER_CONTEXT, accountId: actorId },
      ),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    expect(storage.remove.mock.calls).toContainEqual(['compensation-file']);
  });
});
