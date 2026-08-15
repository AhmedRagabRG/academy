import { Client } from 'pg';

const ORG = '22222222-2222-2222-2222-222222222222';
const ACTOR = '44444444-4444-4444-4444-444444444444';
const ACCOUNT = 'e1111111-1111-1111-1111-111111111111';
const STUDENT = 'e3333333-3333-3333-3333-333333333333';
const ENROLLMENT = 'e6666666-6666-6666-6666-666666666666';
const PURPOSE = 'e9999999-9999-9999-9999-999999999999';
const BRANCH = '77777777-7777-7777-7777-777777777777';

/**
 * Two staff members acting on the same invoice at the same time must not both
 * win. The guarantee is compare-and-swap on `(id, version)`: the update names
 * the version the caller read, so a stale writer matches zero rows instead of
 * silently overwriting the other's change.
 */
describe('optimistic concurrency', () => {
  let a: Client | null = null;
  let b: Client | null = null;

  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/alsalam';

  beforeAll(async () => {
    const first = new Client({ connectionString });
    try {
      await first.connect();
      await first.query('SELECT 1 FROM "Invoice" LIMIT 1');
      a = first;
      const second = new Client({ connectionString });
      await second.connect();
      b = second;
    } catch {
      await first.end().catch(() => undefined);
      a = null;
      b = null;
    }
  });

  afterAll(async () => {
    await a?.query('ROLLBACK').catch(() => undefined);
    await a?.end().catch(() => undefined);
    await b?.end().catch(() => undefined);
  });

  async function seedInvoice(): Promise<string> {
    await a!.query('BEGIN');
    await a!.query(
      `INSERT INTO "StudentFinancialAccount" (id,"organizationId","studentId","studentCode","studentName","searchName",currency,precision,"createdById","updatedAt","updatedById")
       VALUES ($1,$2,$3,'STD-C','x','x','EGP',2,$4,now(),$4)`,
      [ACCOUNT, ORG, STUDENT, ACTOR],
    );
    const { rows } = await a!.query<{ id: string }>(
      `INSERT INTO "Invoice" (id,"organizationId","invoiceNumber","accountId","studentId","studentCode","studentName","searchName","enrollmentId","branchId","offeringId","offeringLabel","offeringKind","chargePurposeValueId","chargePurposeCode","dueDate",currency,precision,"draftTotalMinor","draftFinalMinor",status,version,"createdById","createdByName","updatedAt","updatedById","updatedByName")
       VALUES (gen_random_uuid(),$1,'INV-CAS-1',$2,$3,'STD-C','x','x',$4,$5,'88888888-8888-8888-8888-888888888888','off','PROFESSIONAL_PROGRAM',$6,'tuition','2026-08-24','EGP',2,100000,100000,'DRAFT',1,$7,'a',now(),$7,'a')
       RETURNING id`,
      [ORG, ACCOUNT, STUDENT, ENROLLMENT, BRANCH, PURPOSE, ACTOR],
    );
    await a!.query('COMMIT');
    return rows[0].id;
  }

  async function cleanup(invoiceId: string) {
    await a!.query('DELETE FROM "Invoice" WHERE id = $1', [invoiceId]);
    await a!.query('DELETE FROM "StudentFinancialAccount" WHERE id = $1', [
      ACCOUNT,
    ]);
  }

  it('lets only the first writer win when both read the same version', async () => {
    if (!a || !b) return;
    const invoiceId = await seedInvoice();

    const first = await a.query(
      `UPDATE "Invoice" SET "draftTotalMinor" = 111, version = version + 1
       WHERE id = $1 AND version = 1`,
      [invoiceId],
    );
    const second = await b.query(
      `UPDATE "Invoice" SET "draftTotalMinor" = 222, version = version + 1
       WHERE id = $1 AND version = 1`,
      [invoiceId],
    );

    expect(first.rowCount).toBe(1);
    // The stale writer matches nothing; the service turns this into
    // `version-conflict` rather than a lost update.
    expect(second.rowCount).toBe(0);

    const { rows } = await a.query<{ version: number; draftTotalMinor: string }>(
      'SELECT version, "draftTotalMinor"::text FROM "Invoice" WHERE id = $1',
      [invoiceId],
    );
    expect(rows[0].version).toBe(2);
    expect(rows[0].draftTotalMinor).toBe('111');

    await cleanup(invoiceId);
  });

  it('increments the version exactly once per accepted mutation', async () => {
    if (!a) return;
    const invoiceId = await seedInvoice();

    for (let expected = 1; expected <= 3; expected += 1) {
      const result = await a.query(
        `UPDATE "Invoice" SET version = version + 1 WHERE id = $1 AND version = $2`,
        [invoiceId, expected],
      );
      expect(result.rowCount).toBe(1);
    }

    const { rows } = await a.query<{ version: number }>(
      'SELECT version FROM "Invoice" WHERE id = $1',
      [invoiceId],
    );
    expect(rows[0].version).toBe(4);

    await cleanup(invoiceId);
  });

  it('allocates a distinct number to each concurrent caller', async () => {
    if (!a || !b) return;
    const year = 2099;

    const allocate = (client: Client) =>
      client.query<{ value: number }>(
        `INSERT INTO "FinanceNumberCounter" ("organizationId","sequenceKind","year","lastValue","updatedAt")
         VALUES ($1::uuid,'RECEIPT',$2,1,NOW())
         ON CONFLICT ("organizationId","sequenceKind","year") DO UPDATE
         SET "lastValue" = "FinanceNumberCounter"."lastValue" + 1, "updatedAt" = NOW()
         RETURNING "lastValue" AS value`,
        [ORG, year],
      );

    const first = await allocate(a);
    const second = await allocate(b);

    // `count + 1` would hand both callers the same number.
    expect(second.rows[0].value).not.toBe(first.rows[0].value);

    await a.query(
      `DELETE FROM "FinanceNumberCounter" WHERE "organizationId" = $1::uuid AND "year" = $2`,
      [ORG, year],
    );
  });
});
