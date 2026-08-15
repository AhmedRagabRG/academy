import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

describe('organization database constraints', () => {
  afterAll(() => prisma.$disconnect());

  it('enforces the singleton organization row', async () => {
    await expect(
      prisma.organization.create({
        data: {
          singletonKey: 'SECONDARY',
          code: 'OTHER',
          name: 'مؤسسة أخرى',
          workingHours: {},
        },
      }),
    ).rejects.toBeDefined();
  });

  it('enforces one active academic year', async () => {
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { singletonKey: 'PRIMARY' },
    });
    await expect(
      prisma.academicYear.create({
        data: {
          organizationId: organization.id,
          name: 'عام متزامن',
          normalizedName: 'عام متزامن',
          code: `RACE-${Date.now()}`,
          startDate: new Date('2028-01-01T00:00:00.000Z'),
          endDate: new Date('2028-12-31T00:00:00.000Z'),
          status: 'ACTIVE',
        },
      }),
    ).rejects.toBeDefined();
  });

  it('rejects inclusive sibling term overlap', async () => {
    const year = await prisma.academicYear.findFirstOrThrow({
      where: { status: 'ACTIVE' },
    });
    await expect(
      prisma.academicTerm.create({
        data: {
          organizationId: year.organizationId,
          academicYearId: year.id,
          name: 'فصل متداخل',
          normalizedName: 'فصل متداخل',
          order: 99,
          startDate: new Date('2027-01-15T00:00:00.000Z'),
          endDate: new Date('2027-02-01T00:00:00.000Z'),
        },
      }),
    ).rejects.toBeDefined();
  });
});
