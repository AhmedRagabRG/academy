import type { PrismaClient } from '../generated/client';

const PDF = 'application/pdf';
const JPEG = 'image/jpeg';
const PNG = 'image/png';
const MB = 1024 * 1024;

/**
 * The organization-wide defaults, backfilled from the constants these lists
 * used to live in — `DOCUMENTS` in `admission.service.ts` and
 * `STUDENT_DOCUMENT_TYPES` in `student-document.policy.ts`.
 *
 * They are reproduced exactly so turning the hardcoded arrays into editable
 * rows changes nothing about what the two modules ask for on day one. Anything
 * different after this point is a deliberate edit in Settings.
 */
const ADMISSIONS = [
  ['personal-photo', 'الصورة الشخصية', 'SUBMITTED', [JPEG, PNG], 3 * 1_000_000],
  ['national-id', 'الرقم القومي', 'SUBMITTED', [PDF, JPEG, PNG], 5 * 1_000_000],
  [
    'parent-national-id',
    'الرقم القومي لولي الأمر',
    'APPROVED',
    [PDF, JPEG, PNG],
    5 * 1_000_000,
  ],
  [
    'birth-certificate',
    'شهادة الميلاد',
    'APPROVED',
    [PDF, JPEG, PNG],
    5 * 1_000_000,
  ],
  [
    'qualification-certificate',
    'شهادة المؤهل',
    'APPROVED',
    [PDF, JPEG, PNG],
    5 * 1_000_000,
  ],
  ['declaration', 'الإقرار', 'APPROVED', [PDF, JPEG, PNG], 5 * 1_000_000],
] as const;

const STUDENTS = [
  ['personal-photo', 'الصورة الشخصية', true, false, [JPEG, PNG], 2 * MB],
  ['national-id', 'بطاقة الرقم القومي', true, false, [PDF, JPEG, PNG], 5 * MB],
  [
    'parent-national-id',
    'بطاقة ولي الأمر',
    false,
    false,
    [PDF, JPEG, PNG],
    5 * MB,
  ],
  ['birth-certificate', 'شهادة الميلاد', true, false, [PDF, JPEG, PNG], 5 * MB],
  [
    'qualification-certificate',
    'شهادة المؤهل',
    true,
    false,
    [PDF, JPEG, PNG],
    5 * MB,
  ],
  ['admission-declaration', 'إقرار القبول', true, false, [PDF], 5 * MB],
  ['additional-attachment', 'مرفق إضافي', false, true, [PDF, JPEG, PNG], 10 * MB],
] as const;

/**
 * Idempotent: the policy is matched on its natural key and its definitions are
 * upserted per `stableKey`, so re-running never duplicates a row and never
 * silently discards an edit made in Settings.
 */
export async function seedDocumentRequirements(
  prisma: PrismaClient,
): Promise<void> {
  const organization = await prisma.organization.findFirst({
    select: { id: true },
  });
  if (!organization) return;
  const organizationId = organization.id;

  const policyFor = async (module: 'ADMISSIONS' | 'STUDENTS') => {
    const existing = await prisma.documentRequirementPolicy.findFirst({
      where: { organizationId, module, offeringId: null },
    });
    if (existing) return existing;
    return prisma.documentRequirementPolicy.create({
      data: { organizationId, module, version: 1 },
    });
  };

  const admissions = await policyFor('ADMISSIONS');
  for (const [index, row] of ADMISSIONS.entries()) {
    const [stableKey, label, stage, allowedMimeTypes, maximumBytes] = row;
    await prisma.documentRequirementDefinition.upsert({
      where: { policyId_stableKey: { policyId: admissions.id, stableKey } },
      update: {},
      create: {
        policyId: admissions.id,
        stableKey,
        label,
        enabled: true,
        required: true,
        requiredAtStage: stage,
        allowedMimeTypes: [...allowedMimeTypes],
        maximumBytes,
        displayOrder: index,
      },
    });
  }

  const students = await policyFor('STUDENTS');
  for (const [index, row] of STUDENTS.entries()) {
    const [stableKey, label, required, multiple, allowedMimeTypes, maximumBytes] =
      row;
    await prisma.documentRequirementDefinition.upsert({
      where: { policyId_stableKey: { policyId: students.id, stableKey } },
      update: {},
      create: {
        policyId: students.id,
        stableKey,
        label,
        enabled: true,
        required,
        multiple,
        allowedMimeTypes: [...allowedMimeTypes],
        maximumBytes,
        displayOrder: index,
      },
    });
  }
}
