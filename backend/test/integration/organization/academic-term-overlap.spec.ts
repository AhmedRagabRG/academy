import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
describe('academic term invariants', () => {
  afterAll(() => prisma.$disconnect());
  it('keeps every term within its parent and siblings disjoint', async () => {
    const years = await prisma.academicYear.findMany({
      include: { terms: { orderBy: { startDate: 'asc' } } },
    });
    for (const y of years)
      for (let i = 0; i < y.terms.length; i++) {
        expect(y.terms[i].startDate.getTime()).toBeGreaterThanOrEqual(
          y.startDate.getTime(),
        );
        expect(y.terms[i].endDate.getTime()).toBeLessThanOrEqual(
          y.endDate.getTime(),
        );
        if (i)
          expect(y.terms[i].startDate.getTime()).toBeGreaterThan(
            y.terms[i - 1].endDate.getTime(),
          );
      }
  });
});
