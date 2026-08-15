import type { PrismaClient } from '../generated/client';
import { normalizeArabic } from '../../src/shared/utils/arabic-normalize';

const GROUPS = {
  categories: '10000000-0000-4000-8000-000000000013',
  subcategories: '10000000-0000-4000-8000-000000000014',
};

/**
 * Expense categories and their sub-categories.
 *
 * The two lookup *groups* were already seeded but carried no values, so the
 * category pickers on the expense screens had nothing to offer and a request
 * could not be created at all. Sub-categories hang off their parent through
 * `parentValueId`, which is how the group pair is declared in the schema.
 */
const CATEGORIES: readonly (readonly [
  string,
  string,
  readonly (readonly [string, string])[],
])[] = [
  [
    'salaries',
    'الرواتب والأجور',
    [
      ['basic-salaries', 'رواتب أساسية'],
      ['bonuses', 'مكافآت وحوافز'],
    ],
  ],
  [
    'utilities',
    'المرافق',
    [
      ['electricity', 'كهرباء'],
      ['water', 'مياه'],
      ['internet', 'إنترنت واتصالات'],
    ],
  ],
  [
    'rent',
    'الإيجارات',
    [
      ['branch-rent', 'إيجار الفروع'],
      ['equipment-rent', 'إيجار معدات'],
    ],
  ],
  [
    'supplies',
    'المستلزمات',
    [
      ['office-supplies', 'مستلزمات مكتبية'],
      ['teaching-materials', 'مواد تعليمية'],
    ],
  ],
  [
    'maintenance',
    'الصيانة',
    [
      ['facility-maintenance', 'صيانة المنشآت'],
      ['equipment-maintenance', 'صيانة المعدات'],
    ],
  ],
  [
    'marketing',
    'التسويق',
    [
      ['advertising', 'إعلانات'],
      ['events', 'فعاليات'],
    ],
  ],
];

/** Idempotent: matched on `(lookupGroupId, code)` so a re-run never duplicates. */
export async function seedExpenseLookups(prisma: PrismaClient): Promise<void> {
  let categoryOrder = 10;
  for (const [code, name, children] of CATEGORIES) {
    const existing = await prisma.lookupValue.findFirst({
      where: { lookupGroupId: GROUPS.categories, code },
    });
    const category =
      existing ??
      (await prisma.lookupValue.create({
        data: {
          lookupGroupId: GROUPS.categories,
          code,
          name,
          normalizedName: normalizeArabic(name),
          sortOrder: categoryOrder,
        },
      }));
    categoryOrder += 10;

    let childOrder = 10;
    for (const [childCode, childName] of children) {
      const child = await prisma.lookupValue.findFirst({
        where: { lookupGroupId: GROUPS.subcategories, code: childCode },
      });
      if (!child)
        await prisma.lookupValue.create({
          data: {
            lookupGroupId: GROUPS.subcategories,
            parentValueId: category.id,
            code: childCode,
            name: childName,
            normalizedName: normalizeArabic(childName),
            sortOrder: childOrder,
          },
        });
      childOrder += 10;
    }
  }
}
