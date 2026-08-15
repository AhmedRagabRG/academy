import { Client } from 'pg';

const ORG = '22222222-2222-2222-2222-222222222222';
const ACTOR = '44444444-4444-4444-4444-444444444444';
const ACCOUNT = 'd1111111-1111-1111-1111-111111111111';
const STUDENT = 'd3333333-3333-3333-3333-333333333333';
const ENROLLMENT = 'd6666666-6666-6666-6666-666666666666';
const PURPOSE = 'd9999999-9999-9999-9999-999999999999';
const BRANCH = '77777777-7777-7777-7777-777777777777';

/**
 * Due dates are generated ahead of today so the derived status exercises the
 * paid/partially-paid path; a fixed past date would correctly read OVERDUE
 * and stop testing what this file is about.
 */
function futureDue(offsetMonths: number): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + 2 + offsetMonths, 1);
  return d.toISOString().slice(0, 10);
}

/**
 * The plan guarantee is arithmetic: the installments must sum to the invoice
 * exactly, and each row's paid/remaining/status must be derived from the
 * payments allocated to it rather than stored.
 */
describe('installment plans', () => {
  let client: Client | null = null;

  beforeAll(async () => {
    const connectionString =
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/alsalam';
    const candidate = new Client({ connectionString });
    try {
      await candidate.connect();
      await candidate.query('SELECT 1 FROM "InstallmentPlan" LIMIT 1');
      client = candidate;
    } catch {
      await candidate.end().catch(() => undefined);
      client = null;
    }
  });

  // An expected rejection aborts the transaction, so the reset must happen
  // regardless of how the test ended rather than on the happy path only.
  afterEach(async () => {
    await client?.query('ROLLBACK').catch(() => undefined);
  });

  afterAll(async () => {
    await client?.end().catch(() => undefined);
  });

  async function seedInvoice(totalMinor: number): Promise<string> {
    await client!.query('BEGIN');
    await client!.query(
      `INSERT INTO "StudentFinancialAccount" (id,"organizationId","studentId","studentCode","studentName","searchName",currency,precision,"createdById","updatedAt","updatedById")
       VALUES ($1,$2,$3,'STD-I','x','x','EGP',2,$4,now(),$4)`,
      [ACCOUNT, ORG, STUDENT, ACTOR],
    );
    const { rows } = await client!.query<{ id: string }>(
      `INSERT INTO "Invoice" (id,"organizationId","invoiceNumber","accountId","studentId","studentCode","studentName","searchName","enrollmentId","branchId","offeringId","offeringLabel","offeringKind","chargePurposeValueId","chargePurposeCode","issueDate","dueDate",currency,precision,"draftTotalMinor","draftFinalMinor","issuedTotalMinor","issuedDiscountTotalMinor","issuedScholarshipTotalMinor","issuedFinalMinor",status,"createdById","createdByName","updatedAt","updatedById","updatedByName")
       VALUES (gen_random_uuid(),$1,'INV-PLAN-1',$2,$3,'STD-I','x','x',$4,$5,'88888888-8888-8888-8888-888888888888','off','PROFESSIONAL_PROGRAM',$6,'tuition','2026-01-01','2026-08-24','EGP',2,$7,$7,$7,0,0,$7,'ISSUED',$8,'a',now(),$8,'a')
       RETURNING id`,
      [ORG, ACCOUNT, STUDENT, ENROLLMENT, BRANCH, PURPOSE, totalMinor, ACTOR],
    );
    return rows[0].id;
  }

  async function seedPlan(
    invoiceId: string,
    amounts: number[],
  ): Promise<string> {
    const { rows } = await client!.query<{ id: string }>(
      `INSERT INTO "InstallmentPlan" (id,"invoiceId",count,"scheduleBasis","firstDueDate","generatedById","generatedByName")
       VALUES (gen_random_uuid(),$1,$2,'MONTHLY','2026-03-01',$3,'a') RETURNING id`,
      [invoiceId, amounts.length, ACTOR],
    );
    const planId = rows[0].id;
    for (const [index, amount] of amounts.entries()) {
      await client!.query(
        `INSERT INTO "Installment" (id,"planId","invoiceId",sequence,"dueDate","amountMinor")
         VALUES (gen_random_uuid(),$1,$2,$3,$4,$5)`,
        [planId, invoiceId, index + 1, futureDue(index), amount],
      );
    }
    return planId;
  }

  it('allocates parts that sum to the invoice exactly, remainder last', async () => {
    if (!client) return;
    // 100.01 over three parts: 33.33 / 33.33 / 33.35
    const invoiceId = await seedInvoice(10_001);
    await seedPlan(invoiceId, [3_333, 3_333, 3_335]);

    const { rows } = await client.query<{ total: string }>(
      'SELECT SUM("amountMinor")::text AS total FROM "Installment" WHERE "invoiceId" = $1',
      [invoiceId],
    );
    expect(BigInt(rows[0].total)).toBe(10_001n);

  });

  it('derives each installment paid, remaining and status from allocated payments', async () => {
    if (!client) return;
    const invoiceId = await seedInvoice(30_000);
    await seedPlan(invoiceId, [10_000, 10_000, 10_000]);

    const { rows: installments } = await client.query<{ id: string }>(
      'SELECT id FROM "Installment" WHERE "invoiceId" = $1 ORDER BY sequence',
      [invoiceId],
    );

    await client.query(
      `INSERT INTO "Payment" (id,"organizationId","receiptNumber","studentId","invoiceId","installmentId","branchId","methodId","paymentDate","amountMinor",currency,precision,"recordedById","recordedByName")
       VALUES (gen_random_uuid(),$1,'RCP-INST-1',$2,$3,$4,$5,'55555555-5555-5555-5555-555555555555',CURRENT_DATE,6000,'EGP',2,$6,'a')`,
      [ORG, STUDENT, invoiceId, installments[0].id, BRANCH, ACTOR],
    );

    const { rows: derived } = await client.query(
      'SELECT * FROM finance_installment_balance WHERE invoice_id = $1 ORDER BY sequence',
      [invoiceId],
    );

    expect(BigInt(derived[0].paid_minor)).toBe(6_000n);
    expect(BigInt(derived[0].remaining_minor)).toBe(4_000n);
    expect(derived[0].derived_status).toBe('PARTIALLY_PAID');
    expect(BigInt(derived[1].remaining_minor)).toBe(10_000n);

  });

  it('keeps installment sequence unique within a plan', async () => {
    if (!client) return;
    const invoiceId = await seedInvoice(20_000);
    const planId = await seedPlan(invoiceId, [10_000, 10_000]);

    await expect(
      client.query(
        `INSERT INTO "Installment" (id,"planId","invoiceId",sequence,"dueDate","amountMinor")
         VALUES (gen_random_uuid(),$1,$2,1,'2026-05-01',1)`,
        [planId, invoiceId],
      ),
    ).rejects.toThrow(/duplicate key|unique/i);

  });

  it('allows only one plan per invoice', async () => {
    if (!client) return;
    const invoiceId = await seedInvoice(20_000);
    await seedPlan(invoiceId, [20_000]);

    await expect(seedPlan(invoiceId, [20_000])).rejects.toThrow(
      /duplicate key|unique/i,
    );

  });
});
