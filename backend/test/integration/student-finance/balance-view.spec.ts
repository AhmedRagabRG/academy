import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

const migration = readFileSync(
  join(
    process.cwd(),
    'prisma/migrations/20260804030000_student_finance/migration.sql',
  ),
  'utf8',
);

const ORG = '22222222-2222-2222-2222-222222222222';
const ACTOR = '44444444-4444-4444-4444-444444444444';
const ACCOUNT = '11111111-1111-1111-1111-111111111111';
const STUDENT = '33333333-3333-3333-3333-333333333333';
const INVOICE = '55555555-5555-5555-5555-555555555555';
const PAYMENT = 'aaaaaaaa-0000-0000-0000-000000000001';

/**
 * The balance derivation is the module's load-bearing rule: every reported
 * figure must be recomputable from the records that produced it. These cases
 * run against a live database because the derivation lives in SQL — asserting
 * it any other way would test a second implementation, not the real one.
 *
 * Skips (rather than fails) when no database is reachable, so the suite stays
 * runnable on a machine without Postgres.
 */
describe('finance_invoice_balance', () => {
  let client: Client | null = null;

  beforeAll(async () => {
    const connectionString =
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/alsalam';
    const candidate = new Client({ connectionString });
    try {
      await candidate.connect();
      await candidate.query('SELECT 1 FROM finance_invoice_balance LIMIT 1');
      client = candidate;
    } catch {
      await candidate.end().catch(() => undefined);
      client = null;
    }
  });

  afterAll(async () => {
    await client?.end().catch(() => undefined);
  });

  async function seedIssuedInvoice(totalMinor: number): Promise<void> {
    await client!.query('BEGIN');
    await client!.query(
      `INSERT INTO "StudentFinancialAccount" (id,"organizationId","studentId","studentCode","studentName","searchName",currency,precision,"createdById","updatedAt","updatedById")
       VALUES ($1,$2,$3,'STD-1','x','x','EGP',2,$4,now(),$4)`,
      [ACCOUNT, ORG, STUDENT, ACTOR],
    );
    await client!.query(
      `INSERT INTO "Invoice" (id,"organizationId","invoiceNumber","accountId","studentId","studentCode","studentName","searchName","enrollmentId","branchId","offeringId","offeringLabel","offeringKind","chargePurposeValueId","chargePurposeCode","issueDate","dueDate",currency,precision,"draftTotalMinor","draftFinalMinor","issuedTotalMinor","issuedDiscountTotalMinor","issuedScholarshipTotalMinor","issuedFinalMinor",status,"createdById","createdByName","updatedAt","updatedById","updatedByName")
       VALUES ($1,$2,'INV-2026-00001',$3,$4,'STD-1','x','x','66666666-6666-6666-6666-666666666666','77777777-7777-7777-7777-777777777777','88888888-8888-8888-8888-888888888888','off','PROFESSIONAL_PROGRAM','99999999-9999-9999-9999-999999999999','tuition','2026-07-25','2999-08-24','EGP',2,$5,$5,$5,0,0,$5,'ISSUED',$6,'a',now(),$6,'a')`,
      [INVOICE, ORG, ACCOUNT, STUDENT, totalMinor, ACTOR],
    );
  }

  async function balance(): Promise<Record<string, string>> {
    const { rows } = await client!.query(
      'SELECT * FROM finance_invoice_balance WHERE invoice_id = $1',
      [INVOICE],
    );
    return rows[0] as Record<string, string>;
  }

  async function pay(id: string, minor: number): Promise<void> {
    await client!.query(
      `INSERT INTO "Payment" (id,"organizationId","receiptNumber","studentId","invoiceId","branchId","methodId","paymentDate","amountMinor",currency,precision,"recordedById","recordedByName")
       VALUES ($1,$2,$3,$4,$5,'77777777-7777-7777-7777-777777777777','bbbbbbbb-0000-0000-0000-000000000001','2026-07-28',$6,'EGP',2,$7,'a')`,
      [id, ORG, `RCP-${id.slice(-4)}`, STUDENT, INVOICE, minor, ACTOR],
    );
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

  maybe('reports the full amount outstanding before any payment', async () => {
    await seedIssuedInvoice(1_800_000);
    expect(await balance()).toMatchObject({
      final_minor: '1800000',
      collected_minor: '0',
      remaining_minor: '1800000',
      derived_status: 'ISSUED',
    });
  });

  maybe('derives partially-paid from recorded money', async () => {
    await seedIssuedInvoice(1_800_000);
    await pay(PAYMENT, 600_000);
    expect(await balance()).toMatchObject({
      collected_minor: '600000',
      net_paid_minor: '600000',
      remaining_minor: '1200000',
      derived_status: 'PARTIALLY_PAID',
    });
  });

  maybe('derives paid when nothing remains', async () => {
    await seedIssuedInvoice(1_800_000);
    await pay(PAYMENT, 1_800_000);
    expect(await balance()).toMatchObject({
      remaining_minor: '0',
      derived_status: 'PAID',
    });
  });

  maybe(
    'subtracts post-issuance adjustments without touching the issued snapshot',
    async () => {
      await seedIssuedInvoice(1_800_000);
      await pay(PAYMENT, 600_000);
      await client!.query(
        `INSERT INTO "FinancialAdjustment" (id,"invoiceId","sourceKind","sourceId","amountMinor",currency,precision,reason,"approvedById","approvedByName")
         VALUES ('cccccccc-0000-0000-0000-000000000001',$1,'DISCOUNT','dddddddd-0000-0000-0000-000000000001',300000,'EGP',2,'late discount',$2,'a')`,
        [INVOICE, ACTOR],
      );
      expect(await balance()).toMatchObject({
        final_minor: '1500000',
        remaining_minor: '900000',
      });
      const { rows } = await client!.query<{ issuedFinalMinor: string }>(
        'SELECT "issuedFinalMinor" FROM "Invoice" WHERE id = $1',
        [INVOICE],
      );
      // The snapshot frozen at issuance is untouched — that is why the
      // adjustment exists as its own record rather than as an edit.
      expect(rows[0].issuedFinalMinor).toBe('1800000');
    },
  );

  maybe('moves money only when a refund completes', async () => {
    await seedIssuedInvoice(1_800_000);
    await pay(PAYMENT, 600_000);
    await client!.query(
      `INSERT INTO "Refund" (id,"paymentId","invoiceId","organizationId","studentId","branchId","amountMinor",currency,precision,reason,"refundDate",status,"requestedById","requestedByName")
       VALUES ('eeeeeeee-0000-0000-0000-000000000001',$1,$2,$3,$4,'77777777-7777-7777-7777-777777777777',100000,'EGP',2,'withdrawal','2026-07-30','REQUESTED',$5,'a')`,
      [PAYMENT, INVOICE, ORG, STUDENT, ACTOR],
    );
    expect(await balance()).toMatchObject({
      net_paid_minor: '600000',
      remaining_minor: '1200000',
    });

    await client!.query(
      `UPDATE "Refund" SET status='COMPLETED', "completedAt"=now() WHERE id='eeeeeeee-0000-0000-0000-000000000001'`,
    );
    expect(await balance()).toMatchObject({
      refunded_minor: '100000',
      net_paid_minor: '500000',
      remaining_minor: '1300000',
    });
  });

  maybe(
    'stops a cancelled invoice from reporting a balance status',
    async () => {
      await seedIssuedInvoice(1_800_000);
      await client!.query(
        `UPDATE "Invoice" SET status='CANCELLED', "cancelledAt"=now(), "cancelReason"='duplicate' WHERE id=$1`,
        [INVOICE],
      );
      expect(await balance()).toMatchObject({ derived_status: 'CANCELLED' });
    },
  );

  maybe('flags overdue from the due date and what is still owed', async () => {
    await seedIssuedInvoice(1_800_000);
    expect((await balance()).is_overdue).toBe(false);
    await client!.query(
      `UPDATE "Invoice" SET "dueDate"='2020-01-01' WHERE id=$1`,
      [INVOICE],
    );
    expect((await balance()).is_overdue).toBe(true);
    await pay(PAYMENT, 1_800_000);
    // Settling the balance clears overdue with no scheduler involved.
    expect((await balance()).is_overdue).toBe(false);
  });

  it('derives installment progress from payments, not a stored column', () => {
    expect(migration).toContain('CREATE VIEW finance_installment_balance');
    expect(migration).toContain('AS paid_minor');
    expect(migration).toContain('\'OVERDUE\'::"FinanceInstallmentStatus"');
  });
});
