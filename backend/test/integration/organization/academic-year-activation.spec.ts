import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
describe('academic year activation state', () => {
  afterAll(() => prisma.$disconnect());
  it('has exactly one active year synchronized to settings', async () => {
    const [years, settings] = await Promise.all([
      prisma.academicYear.findMany({
        where: { status: 'ACTIVE', archivedAt: null },
      }),
      prisma.generalSettings.findFirstOrThrow(),
    ]);
    expect(years).toHaveLength(1);
    expect(settings.defaultAcademicYearId).toBe(years[0].id);
  });
});
