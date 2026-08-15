import type { PrismaClient } from '../generated/client';
import { normalizeArabic } from '../../src/shared/utils/arabic-normalize';

const IDS = {
  intakeGroup: '30000000-0000-4000-8000-000000000001',
  fallIntake: '30000000-0000-4000-8000-000000000002',
  springIntake: '30000000-0000-4000-8000-000000000003',
  program: '30000000-0000-4000-8000-000000000004',
  batch: '30000000-0000-4000-8000-000000000005',
  revision: '30000000-0000-4000-8000-000000000006',
} as const;

export async function seedProgramBatches(prisma: PrismaClient): Promise<void> {
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { singletonKey: 'PRIMARY' },
  });
  const group = await prisma.lookupGroup.upsert({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: 'program-intakes',
      },
    },
    update: {
      name: 'مواسم القبول',
      normalizedName: normalizeArabic('مواسم القبول'),
    },
    create: {
      id: IDS.intakeGroup,
      organizationId: organization.id,
      code: 'program-intakes',
      name: 'مواسم القبول',
      normalizedName: normalizeArabic('مواسم القبول'),
    },
  });
  const values = [
    { id: IDS.fallIntake, code: 'fall', name: 'قبول الخريف', sortOrder: 10 },
    {
      id: IDS.springIntake,
      code: 'spring',
      name: 'قبول الربيع',
      sortOrder: 20,
    },
  ];
  for (const value of values) {
    await prisma.lookupValue.upsert({
      where: { id: value.id },
      update: {
        name: value.name,
        normalizedName: normalizeArabic(value.name),
        sortOrder: value.sortOrder,
        status: 'ACTIVE',
      },
      create: {
        ...value,
        lookupGroupId: group.id,
        normalizedName: normalizeArabic(value.name),
      },
    });
  }

  const [type, category, branch, year, actor] = await Promise.all([
    prisma.productType.findUniqueOrThrow({
      where: { identity: 'PROFESSIONAL_PROGRAM' },
    }),
    prisma.lookupValue.findFirstOrThrow({
      where: { lookupGroup: { code: 'business-categories' }, status: 'ACTIVE' },
    }),
    prisma.branch.findFirstOrThrow({ where: { status: 'ACTIVE' } }),
    prisma.academicYear.findFirstOrThrow({ where: { status: 'ACTIVE' } }),
    prisma.account.findFirstOrThrow({ where: { status: 'ACTIVE' } }),
  ]);
  const program = await prisma.academicProduct.upsert({
    where: { code: 'BATCH-DEMO-PROGRAM' },
    update: { status: 'ACTIVE', archivedAt: null },
    create: {
      id: IDS.program,
      organizationId: organization.id,
      officialName: 'برنامج إدارة الأعمال المهني',
      nameAr: 'برنامج إدارة الأعمال المهني',
      nameEn: 'Professional Business Administration',
      normalizedOfficialName: normalizeArabic('برنامج إدارة الأعمال المهني'),
      normalizedNameAr: normalizeArabic('برنامج إدارة الأعمال المهني'),
      normalizedNameEn: 'professional business administration',
      code: 'BATCH-DEMO-PROGRAM',
      productTypeId: type.id,
      categoryId: category.id,
      description: 'برنامج مرجعي لتطوير واختبار الدفعات',
      durationValue: 1,
      numberOfTerms: 2,
      certificateIncluded: true,
      status: 'ACTIVE',
      createdBy: actor.id,
      updatedBy: actor.id,
      pricing: {
        create: {
          currency: 'EGP',
          precision: 2,
          basePrice: 100000n,
          registrationFees: 10000n,
          certificateFees: 0n,
          trainingFees: 0n,
          cardFees: 0n,
          examFees: 0n,
          additionalFees: 0n,
          discount: 0n,
          scholarship: 0n,
          installmentAvailable: true,
        },
      },
      branches: {
        create: [
          { branchId: branch.id, role: 'REGISTRATION' },
          { branchId: branch.id, role: 'STUDY' },
        ],
      },
    },
  });

  const existingBatch = await prisma.programBatch.findUnique({
    where: {
      programId_code: { programId: program.id, code: 'DEMO-2026-FALL' },
    },
  });
  if (!existingBatch) {
    await prisma.$transaction(async (tx) => {
      await tx.programBatch.create({
        data: {
          id: IDS.batch,
          organizationId: organization.id,
          programId: program.id,
          nameAr: 'دفعة الخريف التجريبية',
          nameEn: 'Demo Fall Batch',
          normalizedNameAr: normalizeArabic('دفعة الخريف التجريبية'),
          normalizedNameEn: 'demo fall batch',
          code: 'DEMO-2026-FALL',
          academicYearId: year.id,
          intakeId: IDS.fallIntake,
          description: 'دفعة مرجعية قابلة للتعديل',
          registrationStartDate: new Date('2026-08-01T00:00:00.000Z'),
          registrationEndDate: new Date('2026-08-15T00:00:00.000Z'),
          studyStartDate: new Date('2026-09-01T00:00:00.000Z'),
          studyEndDate: new Date('2027-05-31T00:00:00.000Z'),
          graduationDate: new Date('2027-06-01T00:00:00.000Z'),
          maximumStudents: 30,
          createdBy: actor.id,
          updatedBy: actor.id,
          branches: {
            create: [
              {
                branchId: branch.id,
                role: 'REGISTRATION',
                createdBy: actor.id,
              },
              { branchId: branch.id, role: 'STUDY', createdBy: actor.id },
            ],
          },
        },
      });
      await tx.batchFinancialRevision.create({
        data: {
          id: IDS.revision,
          batchId: IDS.batch,
          revisionNumber: 1,
          programPriceMinor: 100000n,
          programPriceCurrency: 'EGP',
          programPricePrecision: 2,
          registrationFeeMinor: 10000n,
          registrationFeeCurrency: 'EGP',
          registrationFeePrecision: 2,
          installmentsEnabled: false,
          sourceBatchVersion: 1,
          createdBy: actor.id,
        },
      });
      await tx.programBatch.update({
        where: { id: IDS.batch },
        data: { currentFinancialRevisionId: IDS.revision },
      });
      await tx.batchLifecycleEvent.create({
        data: {
          batchId: IDS.batch,
          toStatus: 'DRAFT',
          actorId: actor.id,
          resultingVersion: 1,
        },
      });
    });
  }
}
