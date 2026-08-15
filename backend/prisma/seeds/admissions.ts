import type { PrismaClient } from '../generated/client';

const ORGANIZATION_ID = '10000000-0000-4000-8000-000000000001';

export async function seedAdmissions(prisma: PrismaClient): Promise<void> {
  const [actor, branch, department, leadSource, qualification, products] =
    await Promise.all([
      prisma.account.findFirst({ orderBy: { createdAt: 'asc' } }),
      prisma.branch.findFirst({
        where: { organizationId: ORGANIZATION_ID, status: 'ACTIVE' },
      }),
      prisma.department.findFirst({
        where: { organizationId: ORGANIZATION_ID, status: 'ACTIVE' },
      }),
      prisma.lookupValue.findFirst({
        where: { lookupGroup: { code: 'lead-sources' }, status: 'ACTIVE' },
      }),
      prisma.lookupValue.findFirst({
        where: { lookupGroup: { code: 'qualifications' }, status: 'ACTIVE' },
      }),
      prisma.academicProduct.findMany({
        where: { organizationId: ORGANIZATION_ID },
        include: {
          productType: true,
          pricing: true,
          programBatches: { take: 1 },
        },
        orderBy: { code: 'asc' },
      }),
    ]);
  if (!actor || !branch || !department || !leadSource || !qualification) return;
  const actorId = actor.id;

  for (const [index, product] of products.entries()) {
    const applicantId = `71000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    const admissionId = `72000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    await prisma.applicant.upsert({
      where: { id: applicantId },
      update: {},
      create: {
        id: applicantId,
        organizationId: ORGANIZATION_ID,
        fullName: `Applicant ${index + 1}`,
        normalizedFullName: `applicant ${index + 1}`,
        primaryPhone: `01000000${String(index + 1).padStart(3, '0')}`,
        normalizedPrimaryPhone: `01000000${String(index + 1).padStart(3, '0')}`,
        nationalId: `2000000000000${index + 1}`,
        normalizedNationalId: `2000000000000${index + 1}`,
        address: 'Cairo',
        dateOfBirth: new Date('2000-01-01'),
        qualificationId: qualification.id,
        qualificationLabel: qualification.name,
        graduationYear: 2020,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    await prisma.admission.upsert({
      where: { id: admissionId },
      update: {},
      create: {
        id: admissionId,
        organizationId: ORGANIZATION_ID,
        reference: `ADM-SEED-${String(index + 1).padStart(3, '0')}`,
        applicantId,
        registrationBranchId: branch.id,
        registrationBranchLabel: branch.name,
        studyBranchId: branch.id,
        studyBranchLabel: branch.name,
        admissionsEmployeeId: actorId,
        admissionsEmployeeLabel: 'Seed Administrator',
        customerServiceEmployeeId: actorId,
        customerServiceEmployeeLabel: 'Seed Administrator',
        customerServiceManagerId: actorId,
        customerServiceManagerLabel: 'Seed Administrator',
        departmentId: department.id,
        departmentLabel: department.name,
        leadSourceId: leadSource.id,
        leadSourceLabel: leadSource.name,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });

    const selectionId = `73000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    const kind = product.productType.identity;
    const batch =
      kind === 'PROFESSIONAL_PROGRAM' ? product.programBatches[0] : undefined;
    if (kind === 'PROFESSIONAL_PROGRAM' && !batch) continue;
    await prisma.admissionSelectionRevision.upsert({
      where: { id: selectionId },
      update: {},
      create: {
        id: selectionId,
        admissionId,
        revisionNumber: 1,
        sourceAdmissionVersion: 1,
        resultAdmissionVersion: 1,
        offeringKind: kind,
        offeringId: product.id,
        offeringVersion: product.version,
        offeringLabel: product.officialName,
        offeringCode: product.code,
        batchId: batch?.id,
        batchVersion: batch?.version,
        batchLabel: batch?.nameAr,
        batchCode: batch?.code,
        batchFinancialRevisionId: batch?.currentFinancialRevisionId,
        registrationBranch: { id: branch.id, label: branch.name },
        studyBranch: { id: branch.id, label: branch.name },
        createdBy: actorId,
      },
    });
    /**
     * The priced revision every admission carries.
     *
     * `createAdmission` writes one the moment an admission exists, so an
     * admission without it is a state the API can never produce — and the
     * routes that read it assume it is there. Seeding the selection but not
     * the financials left the demo rows in exactly that shape: opening one and
     * saving it returned `404` from `PATCH /admissions/:id/financials`,
     * because there was no revision to update.
     */
    const batchPrice = batch?.currentFinancialRevisionId
      ? await prisma.batchFinancialRevision.findUnique({
          where: { id: batch.currentFinancialRevisionId },
        })
      : null;
    const price = batchPrice
      ? {
          sourceKind: 'PROGRAM_BATCH' as const,
          sourceId: batch!.id,
          sourceVersion: batch!.version,
          sourceFinancialRevisionId: batchPrice.id,
          productPriceMinor: batchPrice.programPriceMinor,
          registrationFeesMinor: batchPrice.registrationFeeMinor,
          currency: batchPrice.programPriceCurrency,
          precision: batchPrice.programPricePrecision,
        }
      : product.pricing
        ? {
            sourceKind: 'CATALOG_OFFERING' as const,
            sourceId: product.id,
            sourceVersion: product.version,
            sourceFinancialRevisionId: undefined,
            productPriceMinor: product.pricing.basePrice,
            registrationFeesMinor: product.pricing.registrationFees,
            currency: product.pricing.currency,
            precision: product.pricing.precision,
          }
        : null;

    if (price) {
      const financialId = `74000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
      await prisma.admissionFinancialRevision.upsert({
        where: { id: financialId },
        update: {},
        create: {
          id: financialId,
          admissionId,
          revisionNumber: 1,
          sourceKind: price.sourceKind,
          sourceId: price.sourceId,
          sourceVersion: price.sourceVersion,
          sourceFinancialRevisionId: price.sourceFinancialRevisionId,
          productPriceMinor: price.productPriceMinor,
          registrationFeesMinor: price.registrationFeesMinor,
          currency: price.currency,
          precision: price.precision,
          // Seeded undiscounted: the required amount is simply the price plus
          // the registration fee.
          discountMode: 'AMOUNT',
          discountPercentageScaled: 0,
          discountAmountMinor: 0n,
          requiredAmountMinor:
            price.productPriceMinor + price.registrationFeesMinor,
          resultAdmissionVersion: 1,
          createdBy: actorId,
        },
      });
      await prisma.admission.update({
        where: { id: admissionId },
        data: {
          currentSelectionRevisionId: selectionId,
          currentFinancialRevisionId: financialId,
        },
      });
      continue;
    }

    await prisma.admission.update({
      where: { id: admissionId },
      data: { currentSelectionRevisionId: selectionId },
    });
  }
}
