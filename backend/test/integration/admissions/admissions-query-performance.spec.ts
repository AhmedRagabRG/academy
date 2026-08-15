import '../../../test/load-env';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../prisma/generated/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const PREFIX = 'ADM-PERF-ROLLBACK-';

describe('Admissions 10,000-row query evidence', () => {
  afterAll(() => prisma.$disconnect());

  it('uses the operational index and returns a bounded page from 10,000 disposable rows', async () => {
    let evidence:
      | { count: number; rows: number; elapsedMs: number; plan: string }
      | undefined;
    await expect(
      prisma.$transaction(async (tx) => {
        const source = await tx.admission.findFirstOrThrow();
        await tx.$executeRawUnsafe(
          `INSERT INTO "Admission" (
             "id", "organizationId", "reference", "applicantId",
             "registrationBranchId", "registrationBranchLabel",
             "studyBranchId", "studyBranchLabel",
             "admissionsEmployeeId", "admissionsEmployeeLabel",
             "customerServiceEmployeeId", "customerServiceEmployeeLabel",
             "customerServiceManagerId", "customerServiceManagerLabel",
             "departmentId", "departmentLabel", "leadSourceId", "leadSourceLabel",
             "createdAt", "updatedAt", "createdBy", "updatedBy"
           )
           SELECT gen_random_uuid(), $1::uuid, $2 || value::text, $3::uuid,
             $4::uuid, $5, $6::uuid, $7, $8::uuid, $9,
             $10::uuid, $11, $12::uuid, $13, $14::uuid, $15,
             $16::uuid, $17, NOW(), NOW(), $18::uuid, $19::uuid
           FROM generate_series(1, 10000) AS value`,
          source.organizationId,
          PREFIX,
          source.applicantId,
          source.registrationBranchId,
          source.registrationBranchLabel,
          source.studyBranchId,
          source.studyBranchLabel,
          source.admissionsEmployeeId,
          source.admissionsEmployeeLabel,
          source.customerServiceEmployeeId,
          source.customerServiceEmployeeLabel,
          source.customerServiceManagerId,
          source.customerServiceManagerLabel,
          source.departmentId,
          source.departmentLabel,
          source.leadSourceId,
          source.leadSourceLabel,
          source.createdBy,
          source.updatedBy,
        );
        const started = performance.now();
        const rows = await tx.admission.findMany({
          where: {
            organizationId: source.organizationId,
            reference: { startsWith: PREFIX },
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
          take: 100,
          select: { id: true },
        });
        const elapsedMs = performance.now() - started;
        const count = await tx.admission.count({
          where: {
            organizationId: source.organizationId,
            reference: { startsWith: PREFIX },
          },
        });
        const planRows = await tx.$queryRawUnsafe<
          Array<{ 'QUERY PLAN': string }>
        >(
          `EXPLAIN SELECT "id" FROM "Admission"
           WHERE "organizationId" = $1::uuid AND "status" = 'DRAFT'
           ORDER BY "updatedAt" DESC, "id" ASC LIMIT 100`,
          source.organizationId,
        );
        evidence = {
          count,
          rows: rows.length,
          elapsedMs,
          plan: planRows.map((row) => row['QUERY PLAN']).join('\n'),
        };
        throw new Error('ROLLBACK_PERFORMANCE_FIXTURE');
      }),
    ).rejects.toThrow('ROLLBACK_PERFORMANCE_FIXTURE');
    expect(evidence).toBeDefined();
    expect(evidence?.count).toBe(10_000);
    expect(evidence?.rows).toBe(100);
    expect(evidence?.elapsedMs).toBeLessThan(2_000);
    expect(evidence?.plan).toMatch(
      /Admission_organizationId_status_updatedAt_id_idx|Index Scan/,
    );
    await expect(
      prisma.admission.count({ where: { reference: { startsWith: PREFIX } } }),
    ).resolves.toBe(0);
  }, 30_000);
});
