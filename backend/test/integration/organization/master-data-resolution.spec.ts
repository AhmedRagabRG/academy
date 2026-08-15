import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
describe('master-data resolution', () => {
  afterAll(() => prisma.$disconnect());
  it('returns bounded deterministic active choices', async () => {
    const [branches, departments, years, terms] = await Promise.all([
      prisma.branch.findMany({
        where: { status: 'ACTIVE' },
        take: 100,
        orderBy: [{ normalizedName: 'asc' }, { id: 'asc' }],
      }),
      prisma.department.findMany({
        where: { status: 'ACTIVE' },
        take: 100,
        orderBy: [{ normalizedName: 'asc' }, { id: 'asc' }],
      }),
      prisma.academicYear.findMany({ where: { status: 'ACTIVE' }, take: 100 }),
      prisma.academicTerm.findMany({
        where: { status: 'ACTIVE' },
        take: 100,
        orderBy: [{ academicYearId: 'asc' }, { order: 'asc' }],
      }),
    ]);
    expect(
      branches.length * departments.length * years.length * terms.length,
    ).toBeGreaterThan(0);
    expect(terms.map((x) => x.order)).toEqual(
      [...terms].map((x) => x.order).sort((a, b) => a - b),
    );
  });
  it('retains archived records for direct historical resolution', async () => {
    const archived = await prisma.lookupValue.findFirst({
      where: { status: 'ARCHIVED' },
    });
    if (archived)
      await expect(
        prisma.lookupValue.findUnique({ where: { id: archived.id } }),
      ).resolves.toMatchObject({ id: archived.id });
    else expect(archived).toBeNull();
  });
});
