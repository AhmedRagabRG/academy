import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
describe('profile and settings aggregates', () => {
  afterAll(() => prisma.$disconnect());
  it('has one legal profile, primary contacts, and active defaults', async () => {
    const [profiles, settings] = await Promise.all([
      prisma.organization.findMany({ include: { contacts: true } }),
      prisma.generalSettings.findFirstOrThrow({
        include: { defaultBranch: true, defaultAcademicYear: true },
      }),
    ]);
    expect(profiles).toHaveLength(1);
    expect(
      profiles[0].contacts
        .filter((x) => x.isPrimary)
        .map((x) => x.type)
        .sort(),
    ).toEqual(['EMAIL', 'PHONE']);
    expect(settings.defaultBranch.status).toBe('ACTIVE');
    expect(settings.defaultAcademicYear.status).toBe('ACTIVE');
  });
});
