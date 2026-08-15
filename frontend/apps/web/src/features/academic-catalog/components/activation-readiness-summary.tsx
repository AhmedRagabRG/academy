import type { ActivationReadiness } from "../types/common"
export function ActivationReadinessSummary({
  readiness,
}: {
  readiness: ActivationReadiness
}) {
  return (
    <section
      aria-live="polite"
      className={
        readiness.ready
          ? "rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-950"
          : "rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950"
      }
    >
      <h2 className="font-bold">
        {readiness.ready ? "المنتج جاهز للتفعيل" : "متطلبات التفعيل"}
      </h2>
      {!readiness.ready && (
        <ul className="mt-2 list-inside list-disc text-sm">
          {readiness.issues.map((issue) => (
            <li key={`${issue.section}-${issue.field}`}>{issue.message}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
