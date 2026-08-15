import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
describe('academic catalog seed', () => {
  afterAll(() => prisma.$disconnect());
  it('contains exactly the three fixed schema-driving product types', async () => {
    const rows = await prisma.productType.findMany({
      include: { fields: true },
    });
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((x) => x.identity))).toEqual(
      new Set([
        'PROFESSIONAL_PROGRAM',
        'PROFESSIONAL_DIPLOMA',
        'TRAINING_COURSE',
      ]),
    );
    expect(rows.every((x) => x.fields.length > 0)).toBe(true);
  });
  it('owns business categories in Organization lookups', async () => {
    const group = await prisma.lookupGroup.findFirst({
      where: { code: 'business-categories' },
      include: { values: true },
    });
    expect(group?.values.length).toBeGreaterThanOrEqual(4);
  });
});
