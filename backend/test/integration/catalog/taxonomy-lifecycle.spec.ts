import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
describe('taxonomy lifecycle', () => {
  afterAll(() => prisma.$disconnect());
  it('has exactly three immutable identities and contiguous fields', async () => {
    const types = await prisma.productType.findMany({
      include: { fields: { orderBy: { position: 'asc' } } },
    });
    expect(types).toHaveLength(3);
    for (const type of types)
      expect(type.fields.map((x) => x.position)).toEqual(
        type.fields.map((_, i) => i + 1),
      );
  });
});
