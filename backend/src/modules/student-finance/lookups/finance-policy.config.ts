import type {
  DiscountPolicyConfig,
  DuePolicyConfig,
  InstallmentEligibility,
  OfferingKind,
  ScholarshipPolicyConfig,
} from '../types/student-finance.types';

/**
 * One source for every published finance policy figure. `GET /finance/lookups`
 * serves these to the client and the reduction, installment and invoice
 * policies enforce the same constants — a cap the UI shows but the server does
 * not apply is worse than no cap at all.
 *
 * Percentages are scaled by 100 wherever they are compared against a stored
 * `value`, matching `Discount.value` / `Scholarship.value`.
 */

/**
 * The cap, denominated at call time.
 *
 * The figure is a policy constant but the currency is not: it is whatever the
 * organization is configured to bill in, so the cap is built per request
 * rather than frozen here against one denomination.
 */
export const discountPolicy = (
  currency: string,
  precision: number,
): DiscountPolicyConfig => ({
  maxPercentage: '50',
  maxAmount: { amount: '10000.00', currency, precision },
  requiresApproval: true,
});

export const SCHOLARSHIP_POLICY: ScholarshipPolicyConfig = {
  maxPercentage: '100',
  requiresApproval: true,
};

/** `maxPercentage` in the scaled points the stored `value` column uses. */
export const DISCOUNT_MAX_SCALED = 50_00n;
export const SCHOLARSHIP_MAX_SCALED = 100_00n;

/**
 * Only offerings billed as a programme carry a plan. A training course is
 * paid in full, which is why it is present with `allowsPlan: false` rather
 * than omitted — the client renders the reason, not a missing key.
 */
export const INSTALLMENT_ELIGIBILITY: readonly InstallmentEligibility[] = [
  { offeringKind: 'professional-program', allowsPlan: true, maxCount: 12 },
  { offeringKind: 'professional-diploma', allowsPlan: true, maxCount: 12 },
  { offeringKind: 'training-course', allowsPlan: false, maxCount: 0 },
];

export const DUE_POLICY: DuePolicyConfig = {
  defaultDueDays: 30,
  overdueGraceDays: 0,
};

export const INVOICE_STATUSES = [
  'draft',
  'issued',
  'partially-paid',
  'paid',
  'cancelled',
] as const;

export const REFUND_STATUSES = [
  'requested',
  'approved',
  'completed',
  'rejected',
  'cancelled',
] as const;

/**
 * The last-resort denomination, used only when the organization has no
 * configured currency at all.
 *
 * This was `'SAR'` and was read as *the* finance currency, so every invoice,
 * payment and dashboard total was denominated in Riyals no matter what
 * Settings said — the figures came from EGP-priced products and were merely
 * labelled wrong. The currency now comes from `OrganizationSettingsPort`;
 * this constant only covers a missing settings row, and matches the same
 * fallback that port already uses.
 */
export const FINANCE_FALLBACK_CURRENCY = 'EGP';
export const FINANCE_PRECISION = 2;

const STORED_TO_WIRE_KIND: Record<string, OfferingKind> = {
  PROFESSIONAL_PROGRAM: 'professional-program',
  PROFESSIONAL_DIPLOMA: 'professional-diploma',
  TRAINING_COURSE: 'training-course',
};

export const toWireOfferingKind = (stored: string): OfferingKind =>
  STORED_TO_WIRE_KIND[stored] ?? 'training-course';

export const eligibilityFor = (
  offeringKind: string,
): InstallmentEligibility => {
  const wire = toWireOfferingKind(offeringKind);
  return (
    INSTALLMENT_ELIGIBILITY.find((e) => e.offeringKind === wire) ?? {
      offeringKind: wire,
      allowsPlan: false,
      maxCount: 0,
    }
  );
};
