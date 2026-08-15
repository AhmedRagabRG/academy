import { Injectable } from '@nestjs/common';
import type { CallerContext } from '../../../shared/types/caller-context';
import type { FinanceAreaPermissions } from '../types/student-finance.types';

/**
 * Computes the per-record authority object every detail response carries.
 *
 * An absent or empty permissions object blanks the entire action surface of a
 * detail screen, so this is a contract obligation rather than a convenience —
 * and it lives in exactly one place so no controller re-derives authority
 * inline (constitution Principle VII).
 */
@Injectable()
export class FinancePermissionPolicy {
  forCaller(caller: CallerContext): FinanceAreaPermissions {
    const has = (key: string): boolean => caller.permissionKeys.includes(key);
    return {
      view: has('finance.view'),
      invoicesView: has('finance.invoices.view'),
      invoicesCreate: has('finance.invoices.create'),
      invoicesUpdate: has('finance.invoices.update'),
      invoicesIssue: has('finance.invoices.issue'),
      invoicesCancel: has('finance.invoices.cancel'),
      installmentsManage: has('finance.installments.manage'),
      paymentsView: has('finance.payments.view'),
      paymentsRecord: has('finance.payments.record'),
      discountsApprove: has('finance.discounts.approve'),
      scholarshipsApprove: has('finance.scholarships.approve'),
      refundsView: has('finance.refunds.view'),
      refundsRecord: has('finance.refunds.record'),
      // Deliberately distinct from refundsRecord: the person requesting money
      // back is not necessarily the one authorizing it.
      refundsApprove: has('finance.refunds.approve'),
      timelineView: has('finance.timeline.view'),
      export: has('finance.export'),
    };
  }
}
