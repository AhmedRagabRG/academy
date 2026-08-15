import { Injectable } from '@nestjs/common';
import type { Payment } from '../../../../prisma/generated/client';

/** A payment row, optionally joined to the invoice the queue displays. */
type PaymentLike = Payment & {
  invoice?: {
    invoiceNumber: string;
    studentId: string;
    studentCode: string;
    studentName: string;
  };
};
import type { Money } from '../../../shared/types/money';
import { fromMinorUnits } from '../../../shared/utils/money.util';

export interface PaymentResponseDto {
  id: string;
  invoiceId: string;
  /** Present on queue rows, which join their invoice; absent on a bare read. */
  invoiceNumber?: string;
  studentId?: string;
  studentCode?: string;
  studentName?: string;
  installmentId?: string;
  receiptNumber: string;
  amount: Money;
  paymentDate: string;
  /**
   * The schema's `methodId`, published under the name the API contract uses.
   * The rename happens here and nowhere else — internally the column name is
   * the only spelling.
   */
  paymentMethodId: string;
  notes?: string;
  recordedAt: string;
  recordedBy: { id: string; name: string };
}

/** `YYYY-MM-DD`, matching how every other date-only field leaves this API. */
const dateOnly = (value: Date): string => value.toISOString().slice(0, 10);

@Injectable()
export class PaymentMapper {
  /**
   * Money is stored in minor units as a `BigInt` and published as a decimal
   * string through the shared helper, so a payment reads the same way as an
   * invoice total rather than carrying its own arithmetic.
   */
  toResponse(payment: PaymentLike): PaymentResponseDto {
    const invoice = 'invoice' in payment ? payment.invoice : undefined;
    return {
      id: payment.id,
      invoiceId: payment.invoiceId,
      ...(invoice
        ? {
            invoiceNumber: invoice.invoiceNumber,
            studentId: invoice.studentId,
            studentCode: invoice.studentCode,
            studentName: invoice.studentName,
          }
        : {}),
      ...(payment.installmentId
        ? { installmentId: payment.installmentId }
        : {}),
      receiptNumber: payment.receiptNumber,
      amount: fromMinorUnits(
        payment.amountMinor,
        payment.currency,
        payment.precision,
      ),
      paymentDate: dateOnly(payment.paymentDate),
      paymentMethodId: payment.methodId,
      ...(payment.notes ? { notes: payment.notes } : {}),
      recordedAt: payment.recordedAt.toISOString(),
      recordedBy: { id: payment.recordedById, name: payment.recordedByName },
    };
  }

  toList(payments: readonly PaymentLike[]): PaymentResponseDto[] {
    return payments.map((payment) => this.toResponse(payment));
  }
}
