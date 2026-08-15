import type { PrismaClient } from '../generated/client';

const ORGANIZATION_ID = '10000000-0000-4000-8000-000000000001';
const CHARGE_PURPOSE_GROUP_ID = '10000000-0000-4000-8000-000000000031';
const PAYMENT_METHODS_GROUP_ID = '10000000-0000-4000-8000-000000000012';

function normalize(value: string): string {
  return value
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ً-ْ]/g, '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .trim()
    .toLowerCase();
}

/**
 * Charge purposes are configurable master data, not a code enum. Adding a fee
 * type — a new certificate charge, a re-sit fee — must be a lookup row and
 * must not require editing any finance business rule (Principle XIX).
 */
const CHARGE_PURPOSES = [
  { code: 'tuition', name: 'رسوم دراسية', sortOrder: 10 },
  { code: 'registration-fee', name: 'رسوم تسجيل', sortOrder: 20 },
  { code: 'card-fee', name: 'رسوم كارنيه', sortOrder: 30 },
  { code: 'certificate-fee', name: 'رسوم شهادة', sortOrder: 40 },
  { code: 'exam-fee', name: 'رسوم امتحان', sortOrder: 50 },
  { code: 'training-fee', name: 'رسوم تدريب', sortOrder: 60 },
  { code: 'additional-fee', name: 'رسوم إضافية', sortOrder: 70 },
] as const;

/**
 * Payment methods extend the group Organization already owns rather than
 * creating a finance-only copy that could drift from it. `cash` is seeded
 * there already, so only the remaining methods are added.
 */
const PAYMENT_METHODS = [
  { code: 'bank-transfer', name: 'تحويل بنكي', sortOrder: 20 },
  { code: 'card', name: 'بطاقة ائتمانية', sortOrder: 30 },
  { code: 'cheque', name: 'شيك', sortOrder: 40 },
] as const;

export async function seedStudentFinance(prisma: PrismaClient): Promise<void> {
  await prisma.lookupGroup.upsert({
    where: {
      organizationId_code: {
        organizationId: ORGANIZATION_ID,
        code: 'charge-purposes',
      },
    },
    update: { normalizedName: normalize('أغراض الرسوم') },
    create: {
      id: CHARGE_PURPOSE_GROUP_ID,
      organizationId: ORGANIZATION_ID,
      code: 'charge-purposes',
      name: 'أغراض الرسوم',
      normalizedName: normalize('أغراض الرسوم'),
    },
  });

  await prisma.lookupValue.createMany({
    data: [
      ...CHARGE_PURPOSES.map((purpose) => ({
        lookupGroupId: CHARGE_PURPOSE_GROUP_ID,
        code: purpose.code,
        name: purpose.name,
        normalizedName: normalize(purpose.name),
        sortOrder: purpose.sortOrder,
      })),
      ...PAYMENT_METHODS.map((method) => ({
        lookupGroupId: PAYMENT_METHODS_GROUP_ID,
        code: method.code,
        name: method.name,
        normalizedName: normalize(method.name),
        sortOrder: method.sortOrder,
      })),
    ],
    skipDuplicates: true,
  });
}
