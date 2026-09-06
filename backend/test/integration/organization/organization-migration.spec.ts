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
        ('Organization','GeneralSettings','LookupGroup','LookupValue')
    `;
    expect(tables).toHaveLength(4);
  });
});
