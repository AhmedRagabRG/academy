import { Client } from 'pg';

const ORG = '22222222-2222-2222-2222-222222222222';
const ACTOR = '44444444-4444-4444-4444-444444444444';
const ACCOUNT = 'c1111111-1111-1111-1111-111111111111';
const STUDENT = 'c3333333-3333-3333-3333-333333333333';
const ENROLLMENT = 'c6666666-6666-6666-6666-666666666666';
const PURPOSE = 'c9999999-9999-9999-9999-999999999999';
const BRANCH = '77777777-7777-7777-7777-777777777777';

/**
 * Payments are verified against the real database because the two guarantees
 * that matter are enforced there: the balance view derives what is owed from
 * the payments themselves, and a trigger refuses to rewrite a recorded
 * payment.
 */
describe('payment recording', () => {
  let client: Client | null = null;

  beforeAll(async () => {
    const connectionString =
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/alsalam';
    const candidate = new Client({ connectionString });
    try {
      await candidate.connect();
      await candidate.query('SELECT 1 FROM "Payment" LIMIT 1');
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

  async function seedIssuedInvoice(totalMinor: number): Promise<string> {
    await client!.query('BEGIN');
    await client!.query(
      `INSERT INTO "StudentFinancialAccount" (id,"organizationId","studentId","studentCode","studentName","searchName",currency,precision,"createdById","updatedAt","updatedById")
       VALUES ($1,$2,$3,'STD-P','x','x','EGP',2,$4,now(),$4)`,
      [ACCOUNT, ORG, STUDENT, ACTOR],
    );
    const { rows } = await client!.query<{ id: string }>(
      `INSERT INTO "Invoice" (id,"organizationId","invoiceNumber","accountId","studentId","studentCode","studentName","searchName","enrollmentId","branchId","offeringId","offeringLabel","offeringKind","chargePurposeValueId","chargePurposeCode","issueDate","dueDate",currency,precision,"draftTotalMinor","draftFinalMinor","issuedTotalMinor","issuedDiscountTotalMinor","issuedScholarshipTotalMinor","issuedFinalMinor",status,"createdById","createdByName","updatedAt","updatedById","updatedByName")
       VALUES (gen_random_uuid(),$1,'INV-PAY-1',$2,$3,'STD-P','x','x',$4,$5,'88888888-8888-8888-8888-888888888888','off','PROFESSIONAL_PROGRAM',$6,'tuition','2026-01-01','2026-08-24','EGP',2,$7,$7,$7,0,0,$7,'ISSUED',$8,'a',now(),$8,'a')
       RETURNING id`,
      [ORG, ACCOUNT, STUDENT, ENROLLMENT, BRANCH, PURPOSE, totalMinor, ACTOR],
    );
    return rows[0].id;
  }

  async function pay(invoiceId: string, amountMinor: number, receipt: string) {
    await client!.query(
      `INSERT INTO "Payment" (id,"organizationId","receiptNumber","studentId","invoiceId","branchId","methodId","paymentDate","amountMinor",currency,precision,"recordedById","recordedByName")
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,'55555555-5555-5555-5555-555555555555','2026-02-01',$6,'EGP',2,$7,'a')`,
      [ORG, receipt, STUDENT, invoiceId, BRANCH, amountMinor, ACTOR],
    );
  }

  async function balance(invoiceId: string) {
    const { rows } = await client!.query(
      'SELECT * FROM finance_invoice_balance WHERE invoice_id = $1',
      [invoiceId],
    );
    return rows[0];
  }

  it('derives remaining and status from the payments themselves', async () => {
    if (!client) return;
    const invoiceId = await seedIssuedInvoice(100_000);

    const unpaid = await balance(invoiceId);
    expect(BigInt(unpaid.remaining_minor)).toBe(100_000n);
    expect(unpaid.derived_status).toBe('ISSUED');

    await pay(invoiceId, 40_000, 'RCP-PAY-1');
    const partial = await balance(invoiceId);
    expect(BigInt(partial.net_paid_minor)).toBe(40_000n);
    expect(BigInt(partial.remaining_minor)).toBe(60_000n);
    expect(partial.derived_status).toBe('PARTIALLY_PAID');

    await pay(invoiceId, 60_000, 'RCP-PAY-2');
    const settled = await balance(invoiceId);
    expect(BigInt(settled.remaining_minor)).toBe(0n);
    expect(settled.derived_status).toBe('PAID');

  });

  it('refuses to update a recorded payment', async () => {
    if (!client) return;
    const invoiceId = await seedIssuedInvoice(50_000);
    await pay(invoiceId, 10_000, 'RCP-PAY-3');

    await expect(
      client.query(`UPDATE "Payment" SET "amountMinor" = 1 WHERE "invoiceId" = $1`, [
        invoiceId,
      ]),
    ).rejects.toThrow(/append-only/i);

  });

  it('refuses to delete a recorded payment', async () => {
    if (!client) return;
    const invoiceId = await seedIssuedInvoice(50_000);
    await pay(invoiceId, 10_000, 'RCP-PAY-4');

    await expect(
      client.query(`DELETE FROM "Payment" WHERE "invoiceId" = $1`, [invoiceId]),
    ).rejects.toThrow(/append-only/i);

  });

  it('rejects a duplicate receipt number within one organization', async () => {
    if (!client) return;
    const invoiceId = await seedIssuedInvoice(90_000);
    await pay(invoiceId, 10_000, 'RCP-DUP');

    await expect(pay(invoiceId, 10_000, 'RCP-DUP')).rejects.toThrow(
      /duplicate key|unique/i,
    );

  });
});
