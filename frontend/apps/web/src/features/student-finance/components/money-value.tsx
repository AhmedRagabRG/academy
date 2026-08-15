import { formatMoney, type Money } from "@/shared/utils/money"

/**
 * Renders a monetary value.
 *
 * Money is a mixed-direction value inside Arabic layout, so it is wrapped in
 * `<bdi dir="ltr">` to stop surrounding text from reordering its digits. The
 * currency is part of the accessible name rather than decoration, because a bare
 * "١٢٬٠٠٠" announced without its currency is ambiguous in a financial context.
 */
export function MoneyValue({
  value,
  className,
  emphasis = false,
}: {
  value: Money
  className?: string
  emphasis?: boolean
}) {
  const formatted = formatMoney(value)
  return (
    <bdi
      dir="ltr"
      className={className}
      style={emphasis ? { fontWeight: 600 } : undefined}
    >
      {formatted}
    </bdi>
  )
}

/** A labelled figure for summary cards and detail lists. */
export function MoneyFigure({
  label,
  value,
  tone,
}: {
  label: string
  value: Money
  tone?: "positive" | "negative" | "neutral"
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        className={
          tone === "negative"
            ? "text-destructive mt-1 text-lg font-semibold"
            : "mt-1 text-lg font-semibold"
        }
      >
        <MoneyValue value={value} />
      </dd>
    </div>
  )
}
