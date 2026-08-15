import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Reads for the accounting projection. Every `select` is explicit and narrow:
 * selecting whole rows would leak a student name or note the moment a column
 * is added, and this boundary is supposed to make that impossible by
 * construction rather than by review.
 */
@Injectable()
export class FinanceAccountingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSettledInvoices() {
    return this.prisma.invoice.findMany({
      where: { status: { not: 'DRAFT' } },
      select: {
        id: true,
        invoiceNumber: true,
        studentId: true,
        enrollmentId: true,
        issueDate: true,
        status: true,
        currency: true,
        precision: true,
      },
      orderBy: { invoiceNumber: 'asc' },
    });
  }

  findPayments() {
    return this.prisma.payment.findMany({
      select: {
        id: true,
        receiptNumber: true,
        invoiceId: true,
        methodId: true,
        paymentDate: true,
        amountMinor: true,
        currency: true,
        precision: true,
      },
      orderBy: { receiptNumber: 'asc' },
    });
  }

  /** Only completed refunds have moved money and belong in a ledger. */
  findCompletedRefunds() {
    return this.prisma.refund.findMany({
      where: { status: 'COMPLETED' },
      select: {
        id: true,
        paymentId: true,
        invoiceId: true,
        refundDate: true,
        amountMinor: true,
        currency: true,
        precision: true,
        status: true,
      },
      orderBy: { refundDate: 'asc' },
    });
  }
}
