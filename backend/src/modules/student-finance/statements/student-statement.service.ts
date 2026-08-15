import { Injectable } from '@nestjs/common';
import { fromMinorUnits } from '../../../shared/utils/money.util';
import { FinanceBalanceRepository } from '../balances/finance-balance.repository';
import { FinanceBalanceService } from '../balances/finance-balance.service';
import {
  FINANCE_FALLBACK_CURRENCY,
  FINANCE_PRECISION,
} from '../lookups/finance-policy.config';
import { ReductionRepository } from '../reductions/reduction.repository';
import { StudentStatementRepository } from './student-statement.repository';

/**
 * The read-only student financial profile. Every figure is derived from the
 * balance view over the same base facts the invoice list uses, so a statement
 * and a queue can never disagree about what a student owes.
 */
@Injectable()
export class StudentStatementService {
  constructor(
    private readonly repository: StudentStatementRepository,
    private readonly balances: FinanceBalanceService,
    private readonly balanceRepository: FinanceBalanceRepository,
    private readonly reductions: ReductionRepository,
  ) {}

  async profile(studentId: string) {
    const invoices = await this.repository.findInvoicesForStudent(studentId);

    const balanceRows = await this.balanceRepository.forInvoices(
      invoices.map((invoice) => invoice.id),
    );
    const rows = [...balanceRows.values()];

    const currency = invoices[0]?.currency ?? FINANCE_FALLBACK_CURRENCY;
    const precision = invoices[0]?.precision ?? FINANCE_PRECISION;

    // An installment still owing anything counts as outstanding, whether or
    // not it is overdue yet.
    let outstandingInstallments = 0;
    for (const invoice of invoices) {
      const derived = await this.balanceRepository.forInstallments(invoice.id);
      outstandingInstallments += derived.filter(
        (d) => d.remaining_minor > 0n,
      ).length;
    }

    const totals = this.balances.summarizeStudent(
      rows,
      outstandingInstallments,
      currency,
      precision,
    );

    const scholarships =
      await this.reductions.findScholarshipsForStudent(studentId);

    const discounts = (
      await Promise.all(
        invoices.map((invoice) =>
          this.reductions.findDiscountsByInvoiceId(invoice.id),
        ),
      )
    ).flat();

    return {
      studentId,
      totals: {
        totalFees: totals.totalFees,
        paidAmount: totals.paidAmount,
        remainingBalance: totals.remainingBalance,
      },
      outstandingInstallments: totals.outstandingInstallments,
      financialStatus: totals.financialStatus,
      scholarships: scholarships.map((s) => ({
        id: s.id,
        name: s.name,
        kind: s.kind.toLowerCase(),
        coverage: s.coverage.toLowerCase().replaceAll('_', '-'),
        reason: s.reason,
        enrollmentId: s.enrollmentId ?? undefined,
        approvedAt: s.approvedAt.toISOString(),
      })),
      discounts: discounts.map((d) => ({
        id: d.id,
        invoiceId: d.invoiceId,
        kind: d.kind.toLowerCase(),
        reason: d.reason,
        approvedAt: d.approvedAt.toISOString(),
      })),
      perEnrollment: this.groupByEnrollment(invoices, balanceRows, currency, precision),
      // "No invoices at all" and "nothing outstanding" render differently, so
      // the flag is explicit rather than inferred from zero totals.
      hasNoRecords: totals.hasNoRecords,
      asOf: new Date().toISOString(),
    };
  }

  private groupByEnrollment(
    invoices: readonly {
      id: string;
      enrollmentId: string;
      offeringLabel: string;
      offeringKind: string;
    }[],
    balances: Map<string, { finalMinor: bigint; netPaidMinor: bigint; remainingMinor: bigint }>,
    currency: string,
    precision: number,
  ) {
    const grouped = new Map<
      string,
      { offeringLabel: string; total: bigint; paid: bigint; remaining: bigint }
    >();

    for (const invoice of invoices) {
      const balance = balances.get(invoice.id);
      if (!balance) continue;
      const entry = grouped.get(invoice.enrollmentId) ?? {
        offeringLabel: invoice.offeringLabel,
        total: 0n,
        paid: 0n,
        remaining: 0n,
      };
      entry.total += balance.finalMinor;
      entry.paid += balance.netPaidMinor;
      entry.remaining += balance.remainingMinor;
      grouped.set(invoice.enrollmentId, entry);
    }

    return [...grouped].map(([enrollmentId, entry]) => ({
      enrollmentId,
      offeringLabel: entry.offeringLabel,
      totalFees: fromMinorUnits(entry.total, currency, precision),
      paidAmount: fromMinorUnits(entry.paid, currency, precision),
      remainingBalance: fromMinorUnits(entry.remaining, currency, precision),
    }));
  }
}
