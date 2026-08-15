import { Injectable } from '@nestjs/common';
import { Prisma } from '../../prisma/generated/client';
import {
  DependencyInUseException,
  DependencyNotFoundException,
  DuplicateException,
  DateOverlapException,
  OrganizationInvalidStateException,
  BatchHistoryImmutableException,
} from '../core/exceptions';
import {
  AdmissionCurrentPointerConflictException,
  AdmissionHistoryImmutableException,
  AdmissionIdempotencyConflictException,
} from '../core/exceptions/admissions.exceptions';
import {
  FinanceDuplicateNumberException,
  FinanceValidationException,
  InvoiceImmutableException,
  PaymentImmutableException,
} from '../core/exceptions/student-finance.exceptions';
@Injectable()
export class PrismaErrorMapper {
  map(error: unknown): never {
    const text =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null
          ? JSON.stringify(error)
          : String(error);
    if (text.includes('AcademicTerm_no_overlap'))
      throw new DateOverlapException();
    if (
      text.includes(
        'Program Batch financial and lifecycle history is append-only',
      )
    )
      throw new BatchHistoryImmutableException();
    if (
      text.includes('Admission history is append-only') ||
      text.includes('admission history is append-only') ||
      text.includes('AdmissionTimelineEvent_append_only') ||
      text.includes('AdmissionLifecycleEvent_append_only') ||
      text.includes('AdmissionFinancialRevision_append_only') ||
      text.includes('AdmissionSelectionRevision_append_only')
    )
      throw new AdmissionHistoryImmutableException();
    if (
      text.includes('Admission_current_selection_owner') ||
      text.includes('Admission_current_financial_owner') ||
      text.includes('Admission_current_policy_owner') ||
      text.includes('Admission_approval_snapshot_owner') ||
      text.includes('AdmissionDocument_current_version_owner')
    )
      throw new AdmissionCurrentPointerConflictException();
    if (
      text.includes(
        'AdmissionRequestKey_organizationId_operationScope_idempotencyKey_key',
      ) ||
      text.includes('AdmissionDocumentVersion_admissionId_idempotencyKey_key')
    )
      throw new AdmissionIdempotencyConflictException();
    // Student Finance: the database is the last line of defence for
    // immutability, so its rejections must surface as the module's own closed
    // codes rather than a generic 500.
    if (
      text.includes('is append-only') &&
      (text.includes('Payment') ||
        text.includes('InvoiceStatusChange') ||
        text.includes('Discount') ||
        text.includes('Scholarship') ||
        text.includes('FinancialAdjustment') ||
        text.includes('FinanceTimelineEvent') ||
        text.includes('StudentEnrollmentFinancialSnapshot'))
    )
      throw new PaymentImmutableException();
    if (
      text.includes('issued snapshot is write-once') ||
      text.includes('draft figures are editable only') ||
      text.includes('invoice identity and currency are fixed')
    )
      throw new InvoiceImmutableException('issued', ['cancel']);
    if (
      text.includes('Invoice_organizationId_invoiceNumber_key') ||
      text.includes('Payment_organizationId_receiptNumber_key')
    )
      throw new FinanceDuplicateNumberException();
    if (text.includes('Invoice_stored_status_not_derived'))
      throw new FinanceValidationException(
        [{ field: 'status', message: 'derived-status-not-settable' }],
        'لا يمكن تعيين حالة مشتقة للفاتورة',
      );
    if (
      text.includes('ProductPricing_nonnegative') ||
      text.includes('positive_academic')
    )
      throw new OrganizationInvalidStateException(
        'بيانات المنتج الأكاديمية أو المالية غير صالحة',
      );
    if (text.includes('ProductAsset_one_primary'))
      throw new OrganizationInvalidStateException(
        'لا يمكن تعيين أكثر من صورة رئيسية للمنتج',
      );
    if (
      text.includes('AcademicTerm_order_positive') ||
      text.includes('AcademicTerm_academicYearId_order_key')
    )
      throw new OrganizationInvalidStateException(
        'ترتيب الفصول الأكاديمية غير صالح',
      );
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw new DuplicateException();
      if (error.code === 'P2003') throw new DependencyInUseException();
      if (error.code === 'P2025') throw new DependencyNotFoundException();
    }
    throw error;
  }
}
