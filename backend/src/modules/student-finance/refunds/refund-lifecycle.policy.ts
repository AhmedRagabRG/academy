import { Injectable } from '@nestjs/common';

export type RefundStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
export type RefundDecision = 'APPROVED' | 'REJECTED';

@Injectable()
export class RefundLifecyclePolicy {
  /**
   * The transition table from the HTTP contract. `requested → cancelled` is
   * the requester withdrawing their own request, which is why it is reachable
   * from `requested` and not only from `approved`.
   */
  private readonly ALLOWED_TRANSITIONS: Record<RefundStatus, RefundStatus[]> = {
    REQUESTED: ['APPROVED', 'REJECTED', 'CANCELLED'],
    APPROVED: ['COMPLETED', 'CANCELLED'],
    REJECTED: [],
    COMPLETED: [],
    CANCELLED: [],
  };

  private readonly REQUIRES_REASON: RefundStatus[] = ['REJECTED', 'CANCELLED'];

  isTransitionAllowed(fromStatus: RefundStatus, toStatus: RefundStatus): boolean {
    return this.ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
  }

  isTerminalStatus(status: RefundStatus): boolean {
    return this.ALLOWED_TRANSITIONS[status].length === 0;
  }

  isReasonRequired(status: RefundStatus): boolean {
    return this.REQUIRES_REASON.includes(status);
  }

  validateMinimumReasonLength(reason: string, minLength: number = 3): boolean {
    return reason.length >= minLength;
  }

  computeRefundableRemainder(
    totalCollected: bigint,
    currentRefunds: bigint,
    currentRefundRequests: bigint
  ): bigint {
    const totalClaimedForRefund = currentRefunds + currentRefundRequests;
    const refundable = totalCollected - totalClaimedForRefund;
    return refundable > 0n ? refundable : 0n;
  }

  computePaymentRefundable(
    paymentAmount: bigint,
    alreadyRefunded: bigint,
    pendingRefunds: bigint
  ): bigint {
    const claimed = alreadyRefunded + pendingRefunds;
    const available = paymentAmount - claimed;
    return available > 0n ? available : 0n;
  }
}
