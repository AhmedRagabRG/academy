import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

describe('organization migration', () => {
  afterAll(() => prisma.$disconnect());

  it('retains IAM rows and creates all Organization tables', async () => {
    await expect(prisma.account.count()).resolves.toBeGreaterThan(0);
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN
        ('Organization','GeneralSettings','Branch','Department','AcademicYear','AcademicTerm','LookupGroup','LookupValue')
    `;
    expect(tables).toHaveLength(8);
  });

  it('installs the active-year and term-overlap safeguards', async () => {
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = 'AcademicYear_one_active_key'
    `;
    const constraints = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname FROM pg_constraint WHERE conname IN
        ('AcademicTerm_no_overlap','AcademicTerm_order_positive','AcademicTerm_academicYearId_order_key')
    `;
    expect(indexes).toHaveLength(1);
    expect(constraints).toHaveLength(3);
  });
});
