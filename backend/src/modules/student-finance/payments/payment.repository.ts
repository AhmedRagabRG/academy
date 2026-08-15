import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, Payment } from '../../../../prisma/generated/client';

/**
 * Every column the schema requires, and nothing derived. Student, branch,
 * currency and precision are copied from the invoice by the service rather
 * than accepted from the client — a payment that disagrees with its invoice
 * about which branch or currency it belongs to is unauditable.
 */
export interface PaymentCreateInput {
  organizationId: string;
  receiptNumber: string;
  studentId: string;
  invoiceId: string;
  installmentId?: string | null;
  branchId: string;
  methodId: string;
  paymentDate: Date;
  amountMinor: bigint;
  currency: string;
  precision: number;
  notes?: string | null;
  recordedById: string;
  recordedByName: string;
}

/**
 * The queue row joins its invoice for the student and invoice-number columns.
 * `Payment` stores `studentId` but no denormalized name or invoice number, and
 * the payments table renders all three — without the join those columns render
 * blank.
 */
export const paymentListInclude = {
  invoice: {
    select: {
      invoiceNumber: true,
      studentId: true,
      studentCode: true,
      studentName: true,
    },
  },
} satisfies Prisma.PaymentInclude;

export type PaymentWithInvoice = Prisma.PaymentGetPayload<{
  include: typeof paymentListInclude;
}>;

export interface PaymentListFilter {
  organizationId: string;
  search?: string;
  branchIds?: string[];
  studentIds?: string[];
  methodIds?: string[];
  invoiceId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export type PaymentSortField = 'receiptNumber' | 'paymentDate' | 'amount';

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: PaymentCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment> {
    const client = tx ?? this.prisma;
    return client.payment.create({
      data: {
        organizationId: input.organizationId,
        receiptNumber: input.receiptNumber,
        studentId: input.studentId,
        invoiceId: input.invoiceId,
        installmentId: input.installmentId ?? null,
        branchId: input.branchId,
        methodId: input.methodId,
        paymentDate: input.paymentDate,
        amountMinor: input.amountMinor,
        currency: input.currency,
        precision: input.precision,
        notes: input.notes ?? null,
        recordedById: input.recordedById,
        recordedByName: input.recordedByName,
      },
    });
  }

  findById(id: string, tx?: Prisma.TransactionClient): Promise<Payment | null> {
    const client = tx ?? this.prisma;
    return client.payment.findUnique({ where: { id } });
  }

  findByReceiptNumber(
    receiptNumber: string,
    organizationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment | null> {
    const client = tx ?? this.prisma;
    return client.payment.findFirst({
      where: { receiptNumber, organizationId },
    });
  }

  findByInvoiceId(
    invoiceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment[]> {
    const client = tx ?? this.prisma;
    return client.payment.findMany({
      where: { invoiceId },
      orderBy: { paymentDate: 'asc' },
    });
  }

  /** Paged list for `GET /finance/payments`, already branch-scoped by caller. */
  async list(
    filter: PaymentListFilter,
    sort: { field: PaymentSortField; direction: 'asc' | 'desc' },
    paging: { skip: number; take: number },
  ): Promise<{ rows: PaymentWithInvoice[]; total: number }> {
    const where: Prisma.PaymentWhereInput = {
      organizationId: filter.organizationId,
      ...(filter.invoiceId ? { invoiceId: filter.invoiceId } : {}),
      ...(filter.branchIds?.length
        ? { branchId: { in: filter.branchIds } }
        : {}),
      ...(filter.studentIds?.length
        ? { studentId: { in: filter.studentIds } }
        : {}),
      ...(filter.methodIds?.length
        ? { methodId: { in: filter.methodIds } }
        : {}),
      ...(filter.dateFrom || filter.dateTo
        ? {
            paymentDate: {
              ...(filter.dateFrom ? { gte: filter.dateFrom } : {}),
              ...(filter.dateTo ? { lte: filter.dateTo } : {}),
            },
          }
        : {}),
      ...(filter.search
        ? {
            OR: [
              { receiptNumber: { contains: filter.search } },
              { invoice: { invoiceNumber: { contains: filter.search } } },
              { invoice: { studentCode: { contains: filter.search } } },
              { invoice: { searchName: { contains: filter.search } } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.PaymentOrderByWithRelationInput =
      sort.field === 'amount'
        ? { amountMinor: sort.direction }
        : sort.field === 'receiptNumber'
          ? { receiptNumber: sort.direction }
          : { paymentDate: sort.direction };

    const [rows, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: paymentListInclude,
        orderBy,
        skip: paging.skip,
        take: paging.take,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { rows, total };
  }

  async sumPaymentsByInvoiceId(
    invoiceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<bigint> {
    const client = tx ?? this.prisma;
    const result = await client.payment.aggregate({
      where: { invoiceId },
      _sum: { amountMinor: true },
    });
    return result._sum.amountMinor ?? 0n;
  }

  /**
   * A payment changes what the invoice detail reports, so it bumps the
   * invoice version in the same transaction (plan.md, transaction strategy).
   */
  async incrementInvoiceVersion(
    invoiceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const updated = await client.invoice.update({
      where: { id: invoiceId },
      data: { version: { increment: 1 } },
    });
    return updated.version;
  }

  countByInvoiceId(
    invoiceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    return client.payment.count({ where: { invoiceId } });
  }
}
