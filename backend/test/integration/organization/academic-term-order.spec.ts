import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';
import { AcademicTermRepository } from '../../../src/modules/organization/academic-calendar/academic-term.repository';
import { AcademicYearRepository } from '../../../src/modules/organization/academic-calendar/academic-year.repository';
import { AcademicCalendarPolicy } from '../../../src/modules/organization/academic-calendar/academic-calendar.policy';
import { AcademicTermService } from '../../../src/modules/organization/academic-calendar/academic-term.service';
import { TransactionManager } from '../../../src/database/transaction.manager';
import { PrismaErrorMapper } from '../../../src/database/prisma-error.mapper';
import type { PrismaService } from '../../../src/database/prisma.service';
import { EMPTY_CALLER_CONTEXT } from '../../../src/shared/types/caller-context';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const client = prisma as unknown as PrismaService;
const terms = new AcademicTermRepository(client);
const years = new AcademicYearRepository(client);
const service = new AcademicTermService(
  terms,
  new AcademicCalendarPolicy(years, terms),
  {
    compute: () => ({
      'settings.academicTerms.view': true,
      'settings.academicTerms.update': true,
    }),
  } as never,
  { emit: jest.fn() } as never,
  new PrismaErrorMapper(),
  new TransactionManager(client),
);

describe('academic term contiguous ordering', () => {
  let yearId = '';
  let actorId = '';
  beforeAll(async () => {
    const [organization, account] = await Promise.all([
      prisma.organization.findFirstOrThrow(),
      prisma.account.findFirstOrThrow(),
    ]);
    actorId = account.id;
    const year = await prisma.academicYear.create({
      data: {
        organizationId: organization.id,
        name: 'عام الترتيب',
        normalizedName: 'عام الترتيب',
        code: `ORDER-${Date.now()}`,
        startDate: new Date('2030-01-01'),
        endDate: new Date('2030-12-31'),
      },
    });
    yearId = year.id;
  });
  afterAll(async () => {
    if (yearId) {
      await prisma.academicTerm.deleteMany({
        where: { academicYearId: yearId },
      });
      await prisma.academicYear.delete({ where: { id: yearId } });
    }
    await prisma.$disconnect();
  });
  it('inserts and interval-moves terms while preserving 1..N', async () => {
    const caller = {
      ...EMPTY_CALLER_CONTEXT,
      accountId: actorId,
      organizationWide: true,
    };
    await service.create(caller, {
      academicYearId: yearId,
      name: 'الفصل الأول',
      startDate: '2030-01-01',
      endDate: '2030-03-31',
      order: 1,
      expectedAcademicYearVersion: 1,
    });
    await service.create(caller, {
      academicYearId: yearId,
      name: 'الفصل الثاني',
      startDate: '2030-04-01',
      endDate: '2030-06-30',
      order: 1,
      expectedAcademicYearVersion: 2,
    });
    let rows = await prisma.academicTerm.findMany({
      where: { academicYearId: yearId },
      orderBy: { order: 'asc' },
    });
    expect(rows.map((x) => x.order)).toEqual([1, 2]);
    const last = rows[1];
    await service.update(caller, last.id, {
      expectedVersion: last.version,
      expectedAcademicYearVersion: 3,
      order: 1,
    });
    rows = await prisma.academicTerm.findMany({
      where: { academicYearId: yearId },
      orderBy: { order: 'asc' },
    });
    expect(rows.map((x) => x.order)).toEqual([1, 2]);
    expect(rows[0].id).toBe(last.id);
  });
  it('has positive and deferred unique database constraints', async () => {
    const constraints = await prisma.$queryRaw<
      Array<{ conname: string; condeferrable: boolean }>
    >`SELECT conname, condeferrable FROM pg_constraint WHERE conname IN ('AcademicTerm_order_positive','AcademicTerm_academicYearId_order_key') ORDER BY conname`;
    expect(constraints).toHaveLength(2);
    expect(
      constraints.find((x) => x.conname.endsWith('_key'))?.condeferrable,
    ).toBe(true);
  });
});
