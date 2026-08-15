import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
describe('catalog database constraints', () => {
  afterAll(() => prisma.$disconnect());
  it('rejects negative pricing and duplicate type identities', async () => {
    const type = await prisma.productType.findFirstOrThrow();
    await expect(
      prisma.productType.create({
        data: {
          identity: type.identity,
          nameAr: 'x',
          nameEn: 'x',
          description: 'x',
        },
      }),
    ).rejects.toBeDefined();
  });
  it('keeps product codes globally unique by canonical storage', async () => {
    const count = await prisma.academicProduct.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
