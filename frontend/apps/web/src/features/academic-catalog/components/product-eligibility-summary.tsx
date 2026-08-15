import type { EnrollmentEligibility } from "../types/common"
const reasons = {
  eligible: "متاح للتسجيل في هذا الفرع",
  "product-not-active": "المنتج غير نشط",
  "branch-inactive": "الفرع غير نشط",
  "registration-not-assigned": "الفرع غير مخصص للتسجيل",
}
export function ProductEligibilitySummary({
  result,
}: {
  result: EnrollmentEligibility
}) {
  return (
    <p
      aria-live="polite"
      className={result.eligible ? "text-emerald-700" : "text-amber-700"}
    >
      {reasons[result.reason]}
    </p>
  )
}
