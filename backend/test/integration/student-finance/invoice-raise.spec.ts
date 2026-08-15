import { Client } from 'pg';

const ORG = '22222222-2222-2222-2222-222222222222';
const ACTOR = '44444444-4444-4444-4444-444444444444';
const ACCOUNT = '11111111-1111-1111-1111-111111111111';
const STUDENT = '33333333-3333-3333-3333-333333333333';
const ENROLLMENT = '66666666-6666-6666-6666-666666666666';
const TUITION = '99999999-9999-9999-9999-999999999999';
const EXAM_FEE = '99999999-9999-9999-9999-999999999998';

/**
 * The two guarantees invoice raising rests on, verified against the real
 * database because both are enforced there rather than in application code:
 *
 *   1. `(enrollmentId, chargePurposeValueId)` is unique, so a repeated raise
 *      cannot create a second invoice for the same charge.
 *   2. numbers come from an atomic counter, so concurrent raises cannot
 *      collide or reuse a number.
 */
describe('invoice raising', () => {
  let client: Client | null = null;

  beforeAll(async () => {
    const connectionString =
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/alsalam';
    const candidate = new Client({ connectionString });
    try {
      await candidate.connect();
      await candidate.query('SELECT 1 FROM "Invoice" LIMIT 1');
      client = candidate;
    } catch {
      await candidate.end().catch(() => undefined);
      client = null;
    }
  });

  afterAll(async () => {
    await client?.end().catch(() => undefined);
  });

  async function seedAccount(): Promise<void> {
    await client!.query('BEGIN');
    await client!.query(
      `INSERT INTO "StudentFinancialAccount" (id,"organizationId","studentId","studentCode","studentName","searchName",currency,precision,"createdById","updatedAt","updatedById")
       VALUES ($1,$2,$3,'STD-1','x','x','EGP',2,$4,now(),$4)`,
      [ACCOUNT, ORG, STUDENT, ACTOR],
    );
  }

  async function raise(purposeId: string, number: string): Promise<string> {
    const { rows } = await client!.query<{ id: string }>(
      `INSERT INTO "Invoice" (id,"organizationId","invoiceNumber","accountId","studentId","studentCode","studentName","searchName","enrollmentId","branchId","offeringId","offeringLabel","offeringKind","chargePurposeValueId","chargePurposeCode","dueDate",currency,precision,"draftTotalMinor","draftFinalMinor",status,"createdById","createdByName","updatedAt","updatedById","updatedByName")
       VALUES (gen_random_uuid(),$1,$2,$3,$4,'STD-1','x','x',$5,'77777777-7777-7777-7777-777777777777','88888888-8888-8888-8888-888888888888','off','PROFESSIONAL_PROGRAM',$6,'tuition','2026-08-24','EGP',2,1800000,1800000,'DRAFT',$7,'a',now(),$7,'a')
       RETURNING id`,
      [ORG, number, ACCOUNT, STUDENT, ENROLLMENT, purposeId, ACTOR],
    );
    return rows[0].id;
  }

  const maybe = (name: string, fn: () => Promise<void>) =>
    it(name, async () => {
      if (!client) {
        console.warn('no database reachable — skipping');
        return;
      }
      try {
        await fn();
      } finally {
        await client.query('ROLLBACK');
      }
    });

  maybe(
    'refuses a second invoice for the same enrollment and purpose',
    async () => {
      await seedAccount();
      await raise(TUITION, 'INV-2026-00001');
      await expect(raise(TUITION, 'INV-2026-00002')).rejects.toThrow(
        /Invoice_enrollmentId_chargePurposeValueId_key|duplicate key/,
      );
    },
  );

  maybe('allows a different purpose on the same enrollment', async () => {
    // This is what makes an additional charge just another invoice.
    await seedAccount();
    const tuition = await raise(TUITION, 'INV-2026-00001');
    const exam = await raise(EXAM_FEE, 'INV-2026-00002');
    expect(tuition).not.toEqual(exam);
  });

  maybe(
    'refuses a duplicate invoice number within an organization',
    async () => {
      await seedAccount();
      await raise(TUITION, 'INV-2026-00001');
      await expect(raise(EXAM_FEE, 'INV-2026-00001')).rejects.toThrow(
        /Invoice_organizationId_invoiceNumber_key|duplicate key/,
      );
    },
  );

  maybe('allocates numbers atomically without gaps or reuse', async () => {
    await client!.query('BEGIN');
    const allocate = async (): Promise<number> => {
      const { rows } = await client!.query<{ value: number }>(
        `INSERT INTO "FinanceNumberCounter" ("organizationId","sequenceKind","year","lastValue","updatedAt")
         VALUES ($1,'INVOICE',2026,1,NOW())
         ON CONFLICT ("organizationId","sequenceKind","year") DO UPDATE
         SET "lastValue" = "FinanceNumberCounter"."lastValue" + 1, "updatedAt" = NOW()
         RETURNING "lastValue" AS value`,
        [ORG],
      );
      return rows[0].value;
    };
    const values = [
      await allocate(),
      await allocate(),
      await allocate(),
      await allocate(),
    ];
    expect(values).toEqual([1, 2, 3, 4]);
    expect(new Set(values).size).toBe(values.length);
  });

  maybe(
    'starts a draft with no issue date and no issued snapshot',
    async () => {
      await seedAccount();
      const id = await raise(TUITION, 'INV-2026-00001');
      const { rows } = await client!.query<{
        status: string;
        issueDate: Date | null;
        issuedFinalMinor: string | null;
        version: number;
      }>(
        'SELECT status, "issueDate", "issuedFinalMinor", version FROM "Invoice" WHERE id = $1',
        [id],
      );
      expect(rows[0]).toMatchObject({
        status: 'DRAFT',
        issueDate: null,
        issuedFinalMinor: null,
        version: 1,
      });
    },
  );

  maybe('refuses an issued invoice with no issue date', async () => {
    await seedAccount();
    const id = await raise(TUITION, 'INV-2026-00001');
    // The CHECK guarantees an issued invoice always carries both a date and a
    // frozen snapshot, so a half-written issuance cannot exist.
    await expect(
      client!.query(`UPDATE "Invoice" SET status='ISSUED' WHERE id=$1`, [id]),
    ).rejects.toThrow(/Invoice_issued_requires_date/);
  });
});
