import { Inject, Injectable } from '@nestjs/common';
import { fromMinorUnits } from '../../../shared/utils/money.util';
import { FinanceBalanceRepository } from '../balances/finance-balance.repository';
import { FinanceAccountingRepository } from './finance-accounting.repository';
import {
  ORGANIZATION_SETTINGS_PORT,
  type OrganizationSettingsPort,
} from '../../organization/types/organization-settings.port';
import type {
  AccountingContext,
  FinanceAccountingPort,
} from '../types/finance-accounting.port';

/**
 * The settled-facts projection for the future Accounting module.
 *
 * Every `select` here is explicit and deliberately narrow: no student name,
 * no address, no national identifier, and no note content leaves this
 * boundary. Selecting whole rows would leak those the moment a column is
 * added, so the projection names each field it publishes.
 */
@Injectable()
export class FinanceAccountingService implements FinanceAccountingPort {
  constructor(
    private readonly repository: FinanceAccountingRepository,
    private readonly balances: FinanceBalanceRepository,
    @Inject(ORGANIZATION_SETTINGS_PORT)
    private readonly settings: OrganizationSettingsPort,
  ) {}

  async getAccountingContext(): Promise<AccountingContext> {
    const { currency, precision } = await this.settings.financialDefaults();
    const invoices = await this.repository.findSettledInvoices();

    const balances = await this.balances.forInvoices(
      invoices.map((invoice) => invoice.id),
    );

    const payments = await this.repository.findPayments();

    const refunds = await this.repository.findCompletedRefunds();

    return {
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        studentId: invoice.studentId,
        enrollmentId: invoice.enrollmentId,
        issueDate: invoice.issueDate
          ? invoice.issueDate.toISOString().slice(0, 10)
          : '',
        finalAmount: fromMinorUnits(
          balances.get(invoice.id)?.finalMinor ?? 0n,
          invoice.currency,
          invoice.precision,
        ),
        status: invoice.status.toLowerCase().replaceAll('_', '-'),
      })),
      payments: payments.map((payment) => ({
        id: payment.id,
        receiptNumber: payment.receiptNumber,
        invoiceId: payment.invoiceId,
        methodId: payment.methodId,
        paymentDate: payment.paymentDate.toISOString().slice(0, 10),
        amount: fromMinorUnits(
          payment.amountMinor,
          payment.currency,
          payment.precision,
        ),
      })),
      refunds: refunds.map((refund) => ({
        id: refund.id,
        paymentId: refund.paymentId,
        invoiceId: refund.invoiceId,
        refundDate: refund.refundDate.toISOString().slice(0, 10),
        amount: fromMinorUnits(
          refund.amountMinor,
          refund.currency,
          refund.precision,
        ),
        status: refund.status.toLowerCase(),
      })),
      asOf: new Date().toISOString(),
      currency,
      precision,
    };
  }
}
