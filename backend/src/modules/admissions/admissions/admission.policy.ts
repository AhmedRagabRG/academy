import { Injectable } from '@nestjs/common';
import type { AdmissionStatus } from '../types/admissions.types';

export type AdmissionLifecycleAction =
  | 'submit'
  | 'start-review'
  | 'approve'
  | 'reject'
  | 'return'
  | 'archive'
  | 'enroll';

export interface AdmissionTransitionDecision {
  allowed: boolean;
  action?: AdmissionLifecycleAction;
  permission?: string;
  reasonRequired: boolean;
  readinessAction?: 'submit' | 'approve' | 'enroll';
  clearsReviewer: boolean;
  acquiresReviewer: boolean;
}

const TRANSITIONS: Readonly<
  Partial<
    Record<
      AdmissionStatus,
      Partial<Record<AdmissionStatus, AdmissionTransitionDecision>>
    >
  >
> = {
  draft: {
    submitted: decision('submit', 'admissions.submit', {
      readinessAction: 'submit',
    }),
    archived: decision('archive', 'admissions.archive', {
      reasonRequired: true,
    }),
  },
  submitted: {
    'under-review': decision('start-review', 'admissions.review', {
      acquiresReviewer: true,
    }),
    archived: decision('archive', 'admissions.archive', {
      reasonRequired: true,
    }),
  },
  'under-review': {
    approved: decision('approve', 'admissions.approve', {
      readinessAction: 'approve',
      clearsReviewer: true,
    }),
    rejected: decision('reject', 'admissions.reject', {
      reasonRequired: true,
      clearsReviewer: true,
    }),
    draft: decision('return', 'admissions.return', {
      reasonRequired: true,
      clearsReviewer: true,
    }),
    archived: decision('archive', 'admissions.archive', {
      reasonRequired: true,
      clearsReviewer: true,
    }),
  },
  approved: {
    enrolled: decision('enroll', undefined, { readinessAction: 'enroll' }),
    archived: decision('archive', 'admissions.archive', {
      reasonRequired: true,
    }),
  },
  rejected: {
    archived: decision('archive', 'admissions.archive', {
      reasonRequired: true,
    }),
  },
};

function decision(
  action: AdmissionLifecycleAction,
  permission?: string,
  options: Partial<
    Omit<AdmissionTransitionDecision, 'allowed' | 'action' | 'permission'>
  > = {},
): AdmissionTransitionDecision {
  return Object.freeze({
    allowed: true,
    action,
    permission,
    reasonRequired: false,
    clearsReviewer: false,
    acquiresReviewer: false,
    ...options,
  });
}

const REFUSED: AdmissionTransitionDecision = Object.freeze({
  allowed: false,
  reasonRequired: false,
  clearsReviewer: false,
  acquiresReviewer: false,
});

@Injectable()
export class AdmissionPolicy {
  transition(
    from: AdmissionStatus,
    to: AdmissionStatus,
  ): AdmissionTransitionDecision {
    return TRANSITIONS[from]?.[to] ?? REFUSED;
  }

  canActAsReviewer(
    activeReviewerId: string | null | undefined,
    actorId: string,
  ): boolean {
    return !activeReviewerId || activeReviewerId === actorId;
  }

  availableActions(
    status: AdmissionStatus,
    permissionKeys: readonly string[],
    activeReviewerId?: string | null,
    actorId?: string,
  ): AdmissionLifecycleAction[] {
    const permissions = new Set(permissionKeys);
    return Object.values(TRANSITIONS[status] ?? {})
      .filter((item): item is AdmissionTransitionDecision =>
        Boolean(item?.allowed),
      )
      .filter((item) => !item.permission || permissions.has(item.permission))
      .filter(
        (item) =>
          status !== 'under-review' ||
          !actorId ||
          item.action === 'archive' ||
          this.canActAsReviewer(activeReviewerId, actorId),
      )
      .map((item) => item.action)
      .filter((action): action is AdmissionLifecycleAction => Boolean(action));
  }

  hasRequiredReason(
    decision: AdmissionTransitionDecision,
    reason?: string,
  ): boolean {
    return !decision.reasonRequired || Boolean(reason?.trim());
  }
}
