import type { FinancialPreparationRevision } from "../types/domain"

export function AdmissionFinancialSummary({
  financial,
}: {
  financial: FinancialPreparationRevision
}) {
  const value = (amount: string) => (
    <bdi dir="ltr">
      {amount} {financial.requiredAmount.currency}
    </bdi>
  )
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid gap-3 rounded-lg bg-brand-navy p-4 text-white sm:grid-cols-3"
    >
      <div>
        <p className="text-xs text-white/70">سعر المنتج</p>
        <p className="font-semibold">{value(financial.productPrice.amount)}</p>
      </div>
      <div>
        <p className="text-xs text-white/70">قيمة الخصم</p>
        <p className="font-semibold">
          {value(financial.discountAmount.amount)}
        </p>
      </div>
      <div>
        <p className="text-xs text-white/70">المبلغ المطلوب</p>
        <p className="font-heading text-lg font-bold text-brand-gold">
          {value(financial.requiredAmount.amount)}
        </p>
      </div>
    </div>
  )
}
