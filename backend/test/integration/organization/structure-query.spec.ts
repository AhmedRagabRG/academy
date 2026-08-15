import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';
import { normalizeOrganizationSearch } from '../../../src/modules/organization/types/organization-normalization';
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
describe('structure queries', () => {
  afterAll(() => prisma.$disconnect());
  it('finds normalized Arabic structure and keeps stable ordering', async () => {
    const q = normalizeOrganizationSearch('الإدارة');
    const rows = await prisma.department.findMany({
      where: { normalizedName: { contains: q } },
      orderBy: [{ code: 'asc' }, { id: 'asc' }],
    });
    expect(rows.map((x) => x.code)).toContain('ADMIN');
  });
  it('supports empty over-range pages', async () => {
    expect(await prisma.branch.findMany({ skip: 100000, take: 20 })).toEqual(
      [],
    );
  });
});
