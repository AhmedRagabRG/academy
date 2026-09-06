import type { PrismaClient } from '../generated/client';
import { normalizeArabic } from '../../src/shared/utils/arabic-normalize';

const IDS = {
  organization: '10000000-0000-4000-8000-000000000001',
  settings: '10000000-0000-4000-8000-000000000007',
  qualifications: '10000000-0000-4000-8000-000000000008',
  studyModes: '10000000-0000-4000-8000-000000000009',
  leadSources: '10000000-0000-4000-8000-000000000010',
  academicGrades: '10000000-0000-4000-8000-000000000011',
  paymentMethods: '10000000-0000-4000-8000-000000000012',
} as const;

const normalize = (value: string) => normalizeArabic(value);

export async function seedOrganizationMasterData(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.organization.upsert({
    where: { singletonKey: 'PRIMARY' },
    update: {},
    create: {
      id: IDS.organization,
      singletonKey: 'PRIMARY',
      code: 'ALSALAM',
      name: 'أكاديمية السلام المهني',
      website: 'https://alsalam.academy',
      address: 'القاهرة، جمهورية مصر العربية',
      workingHours: {
        sun: '09:00-17:00',
        mon: '09:00-17:00',
        tue: '09:00-17:00',
        wed: '09:00-17:00',
        thu: '09:00-17:00',
      },
      contacts: {
        create: [
          {
            type: 'EMAIL',
            label: 'البريد الرئيسي',
            value: 'info@alsalam.academy',
            isPrimary: true,
          },
          {
            type: 'PHONE',
            label: 'الهاتف الرئيسي',
            value: '+201000000000',
            isPrimary: true,
          },
        ],
      },
    },
  });

  await prisma.generalSettings.upsert({
    where: { organizationId: IDS.organization },
    update: {},
    create: {
      id: IDS.settings,
      organizationId: IDS.organization,
      defaultLanguage: 'ar',
      timeZone: 'Africa/Cairo',
      currency: 'EGP',
      dateFormat: 'dd/MM/yyyy',
      numberFormat: 'ar-EG',
      workingDays: ['sun', 'mon', 'tue', 'wed', 'thu'],
    },
  });

  const groups = [
    [IDS.qualifications, 'qualifications', 'المؤهلات', null],
    [IDS.studyModes, 'study-modes', 'أنماط الدراسة', null],
    [IDS.leadSources, 'lead-sources', 'مصادر العملاء', null],
    [IDS.academicGrades, 'academic-grades', 'التقديرات الأكاديمية', null],
    [IDS.paymentMethods, 'payment-methods', 'طرق الدفع', null],
  ] as const;
  for (const [id, code, name, parentGroupId] of groups) {
    await prisma.lookupGroup.upsert({
      where: {
        organizationId_code: { organizationId: IDS.organization, code },
      },
      update: { normalizedName: normalize(name) },
      create: {
        id,
        organizationId: IDS.organization,
        code,
        name,
        normalizedName: normalize(name),
        parentGroupId,
      },
    });
  }

  await prisma.lookupValue.createMany({
    data: [
      {
        lookupGroupId: IDS.studyModes,
        name: 'حضوري',
        normalizedName: normalize('حضوري'),
        code: 'in-person',
        sortOrder: 10,
      },
      {
        lookupGroupId: IDS.studyModes,
        name: 'عن بعد',
        normalizedName: normalize('عن بعد'),
        code: 'online',
        sortOrder: 20,
      },
      {
        lookupGroupId: IDS.paymentMethods,
        name: 'نقدي',
        normalizedName: normalize('نقدي'),
        code: 'cash',
        sortOrder: 10,
      },
      {
        lookupGroupId: IDS.qualifications,
        name: 'بكالوريوس',
        normalizedName: normalize('بكالوريوس'),
        code: 'bachelor',
        sortOrder: 10,
      },
      {
        lookupGroupId: IDS.leadSources,
        name: 'الموقع الإلكتروني',
        normalizedName: normalize('الموقع الإلكتروني'),
        code: 'website',
        sortOrder: 10,
      },
      {
        lookupGroupId: IDS.academicGrades,
        name: 'جيد',
        normalizedName: normalize('جيد'),
        code: 'good',
        sortOrder: 10,
      },
    ],
    skipDuplicates: true,
  });
}
