import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
describe('profile and settings aggregates', () => {
  afterAll(() => prisma.$disconnect());
  it('has one legal profile with primary contacts', async () => {
    const profiles = await prisma.organization.findMany({
      include: { contacts: true },
    });
    expect(profiles).toHaveLength(1);
    expect(
      profiles[0].contacts
        .filter((x) => x.isPrimary)
        .map((x) => x.type)
        .sort(),
    ).toEqual(['EMAIL', 'PHONE']);
  });
});
