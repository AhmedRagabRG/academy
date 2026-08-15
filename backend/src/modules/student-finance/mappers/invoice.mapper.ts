import { Injectable } from '@nestjs/common';
import { fromMinorUnits } from '../../../shared/utils/money.util';
import type { CallerContext } from '../../../shared/types/caller-context';
import { FinancePermissionPolicy } from '../policies/finance-permission.policy';
import type { InvoiceDetailRecord } from '../invoices/invoice.repository';
import type {
  DerivedInvoiceBalance,
  InvoiceFigures,
  InvoiceStatus,
  OfferingKind,
} from '../types/student-finance.types';

const STATUS_TO_WIRE: Record<string, InvoiceStatus> = {
  DRAFT: 'draft',
  ISSUED: 'issued',
  PARTIALLY_PAID: 'partially-paid',
  PAID: 'paid',
  CANCELLED: 'cancelled',
};

const KIND_TO_WIRE: Record<string, OfferingKind> = {
  PROFESSIONAL_PROGRAM: 'professional-program',
  PROFESSIONAL_DIPLOMA: 'professional-diploma',
  TRAINING_COURSE: 'training-course',
};

@Injectable()
export class InvoiceMapper {
  constructor(private readonly permissions: FinancePermissionPolicy) {}

  toWireStatus(stored: string): InvoiceStatus {
    return STATUS_TO_WIRE[stored] ?? 'draft';
  }

  toWireKind(stored: string): OfferingKind {
    return KIND_TO_WIRE[stored] ?? 'training-course';
  }

  private date(value: Date | null): string | undefined {
    return value ? value.toISOString().slice(0, 10) : undefined;
  }

  private figures(
    total: bigint,
    discount: bigint,
    scholarship: bigint,
    final: bigint,
    currency: string,
    precision: number,
  ): InvoiceFigures {
    return {
      totalAmount: fromMinorUnits(total, currency, precision),
      discountTotal: fromMinorUnits(discount, currency, precision),
      scholarshipTotal: fromMinorUnits(scholarship, currency, precision),
      finalAmount: fromMinorUnits(final, currency, precision),
    };
  }

  /**
   * The single fat detail response feeding every section of the invoice
   * screen. `derived` carries the computed balance; the stored columns carry
   * only what was actually written.
   */
  toDetail(
    record: InvoiceDetailRecord,
    derived: DerivedInvoiceBalance,
    caller: CallerContext,
  ) {
    const { currency, precision } = record;
    return {
      id: record.id,
      organizationId: record.organizationId,
      invoiceNumber: record.invoiceNumber,
      studentId: record.studentId,
      studentCode: record.studentCode,
      studentName: record.studentName,
      enrollmentId: record.enrollmentId,
      branchId: record.branchId,
      offeringId: record.offeringId,
      offeringLabel: record.offeringLabel,
      offeringKind: this.toWireKind(record.offeringKind),
      batchId: record.batchId ?? undefined,
      batchLabel: record.batchLabel ?? undefined,
      purpose: record.chargePurposeCode,
      issueDate: this.date(record.issueDate),
      dueDate: this.date(record.dueDate)!,
      currency,
      precision,
      draft: this.figures(
        record.draftTotalMinor,
        record.draftDiscountTotalMinor,
        record.draftScholarshipTotalMinor,
        record.draftFinalMinor,
        currency,
        precision,
      ),
      // Absent until issuance, and written exactly once when it appears.
      issuedSnapshot:
        record.issuedFinalMinor === null
          ? undefined
          : this.figures(
              record.issuedTotalMinor!,
              record.issuedDiscountTotalMinor!,
              record.issuedScholarshipTotalMinor!,
              record.issuedFinalMinor,
              currency,
              precision,
            ),
      // The presented status is the derived one: an invoice with payments
      // stores ISSUED but presents as partially-paid.
      status: derived.status,
      statusHistory: record.statusHistory.map((entry) => ({
        fromStatus: entry.fromStatus
          ? this.toWireStatus(entry.fromStatus)
          : null,
        toStatus: this.toWireStatus(entry.toStatus),
        reason: entry.reason ?? undefined,
        actor: { id: entry.actorId, name: entry.actorName, active: true },
        occurredAt: entry.occurredAt.toISOString(),
      })),
      cancelledAt: record.cancelledAt?.toISOString(),
      cancelReason: record.cancelReason ?? undefined,
      derived: {
        finalAmount: derived.finalAmount,
        netPaid: derived.netPaid,
        remaining: derived.remaining,
        status: derived.status,
        isOverdue: derived.isOverdue,
      },
      permissions: this.permissions.forCaller(caller),
      version: record.version,
      createdAt: record.createdAt.toISOString(),
      createdBy: {
        id: record.createdById,
        name: record.createdByName,
        active: true,
      },
      updatedAt: record.updatedAt.toISOString(),
      updatedBy: {
        id: record.updatedById,
        name: record.updatedByName,
        active: true,
      },
    };
  }

  /** The list row. Money figures come from the derivation, never a column. */
  toSummary(record: InvoiceDetailRecord, derived: DerivedInvoiceBalance) {
    return {
      id: record.id,
      invoiceNumber: record.invoiceNumber,
      studentId: record.studentId,
      studentCode: record.studentCode,
      studentName: record.studentName,
      offeringLabel: record.offeringLabel,
      batchLabel: record.batchLabel ?? undefined,
      branchId: record.branchId,
      purpose: record.chargePurposeCode,
      issueDate: this.date(record.issueDate),
      dueDate: this.date(record.dueDate)!,
      finalAmount: derived.finalAmount,
      paidAmount: derived.netPaid,
      remaining: derived.remaining,
      status: derived.status,
      isOverdue: derived.isOverdue,
      updatedAt: record.updatedAt.toISOString(),
      version: record.version,
    };
  }
}
