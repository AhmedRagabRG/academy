import { describe, expect, it } from '@jest/globals';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { InvoiceController } from '../../../src/modules/student-finance/invoices/invoice.controller';
import { PaymentController } from '../../../src/modules/student-finance/payments/payment.controller';
import { InstallmentController } from '../../../src/modules/student-finance/installments/installment.controller';
import { ReductionController } from '../../../src/modules/student-finance/reductions/reduction.controller';
import { RefundController } from '../../../src/modules/student-finance/refunds/refund.controller';
import { StudentStatementController } from '../../../src/modules/student-finance/statements/student-statement.controller';
import { FinanceDashboardController } from '../../../src/modules/student-finance/dashboard/finance-dashboard.controller';
import { FinanceLookupsController } from '../../../src/modules/student-finance/lookups/finance-lookups.controller';
import { AccountingContextController } from '../../../src/modules/student-finance/integration/accounting-context.controller';

const CONTROLLERS = [
  InvoiceController,
  PaymentController,
  InstallmentController,
  ReductionController,
  RefundController,
  StudentStatementController,
  FinanceDashboardController,
  FinanceLookupsController,
  AccountingContextController,
];

const METHOD_NAME: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
};

/** Reads the routes Nest would register, without booting the app or a database. */
function collectRoutes(): string[] {
  const routes: string[] = [];
  for (const controller of CONTROLLERS) {
    const base = Reflect.getMetadata(PATH_METADATA, controller) ?? '';
    const proto = controller.prototype as unknown as Record<string, unknown>;
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === 'constructor') continue;
      const handler = proto[key];
      if (typeof handler !== 'function') continue;
      const path = Reflect.getMetadata(PATH_METADATA, handler);
      const method = Reflect.getMetadata(METHOD_METADATA, handler);
      if (path === undefined || method === undefined) continue;
      const full = `/${base}/${path}`.replace(/\/+/g, '/').replace(/\/$/, '');
      routes.push(`${METHOD_NAME[method as number]} ${full || '/'}`);
    }
  }
  return routes.sort();
}

/**
 * The canonical surface from `contracts/student-finance-http.contract.md`.
 * The contract states these operations are exactly the surface, so this
 * list is the assertion, not a sample of it.
 */
const CANONICAL = [
  'GET /finance/invoices',
  'GET /finance/invoices/export',
  'GET /finance/invoices/:invoiceId',
  'GET /finance/invoices/:invoiceId/installment-policy',
  'POST /finance/invoices',
  'PATCH /finance/invoices/:invoiceId',
  'POST /finance/invoices/:invoiceId/issue',
  'POST /finance/invoices/:invoiceId/cancel',
  'POST /finance/invoices/:invoiceId/installment-plan',
  'POST /finance/invoices/:invoiceId/discounts',
  'GET /finance/payments',
  'POST /finance/payments',
  'GET /finance/installments',
  'GET /finance/refunds',
  'POST /finance/refunds',
  'PATCH /finance/refunds/:refundId/decision',
  'POST /finance/refunds/:refundId/complete',
  'POST /finance/scholarships',
  'GET /finance/students/:studentId/profile',
  'GET /finance/students/:studentId/timeline',
  'GET /finance/dashboard/summary',
  'GET /finance/lookups',
  'GET /finance/accounting-context',
].sort();

describe('Student Finance HTTP surface', () => {
  const routes = collectRoutes();

  it('exposes exactly the canonical operations', () => {
    expect(routes).toEqual(CANONICAL);
  });

  describe('prohibited surface', () => {
    it('registers no DELETE on any finance route — cancellation is the only reversal', () => {
      expect(routes.filter((r) => r.startsWith('DELETE '))).toEqual([]);
    });

    it('registers no PATCH or PUT on a payment — a payment is immutable', () => {
      const mutations = routes.filter(
        (r) =>
          (r.startsWith('PATCH ') || r.startsWith('PUT ')) &&
          r.includes('/finance/payments'),
      );
      expect(mutations).toEqual([]);
    });

    it('exposes no route that writes an issued snapshot', () => {
      expect(routes.filter((r) => /issued/i.test(r))).toEqual([]);
    });
  });

  it('declares the export route before the :invoiceId parameter route', () => {
    // Otherwise "export" is captured as an invoice id and the download 404s.
    const invoiceRoutes = collectRoutesFor(InvoiceController);
    expect(invoiceRoutes.indexOf('GET /finance/invoices/export')).toBeLessThan(
      invoiceRoutes.indexOf('GET /finance/invoices/:invoiceId'),
    );
  });
});

/** Declaration order matters for route matching, so this preserves it. */
function collectRoutesFor(controller: (typeof CONTROLLERS)[number]): string[] {
  const base = Reflect.getMetadata(PATH_METADATA, controller) ?? '';
  const proto = controller.prototype as unknown as Record<string, unknown>;
  const routes: string[] = [];
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key === 'constructor') continue;
    const handler = proto[key];
    if (typeof handler !== 'function') continue;
    const path = Reflect.getMetadata(PATH_METADATA, handler);
    const method = Reflect.getMetadata(METHOD_METADATA, handler);
    if (path === undefined || method === undefined) continue;
    const full = `/${base}/${path}`.replace(/\/+/g, '/').replace(/\/$/, '');
    routes.push(`${METHOD_NAME[method as number]} ${full || '/'}`);
  }
  return routes;
}
