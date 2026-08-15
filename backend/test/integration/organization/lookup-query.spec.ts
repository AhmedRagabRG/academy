import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
describe('lookup catalogue query', () => {
  afterAll(() => prisma.$disconnect());
  it('returns deterministic active selectable values', async () => {
    const rows = await prisma.lookupValue.findMany({
      where: { lookupGroup: { code: 'study-modes' }, status: 'ACTIVE' },
      orderBy: [{ sortOrder: 'asc' }, { normalizedName: 'asc' }, { id: 'asc' }],
    });
    expect(rows.map((x) => x.code)).toEqual(['in-person', 'online']);
  });
  it('keeps codes unique within each group', async () => {
    const rows = await prisma.lookupValue.groupBy({
      by: ['lookupGroupId', 'code'],
      _count: true,
    });
    expect(rows.every((x) => x._count === 1)).toBe(true);
  });
});
