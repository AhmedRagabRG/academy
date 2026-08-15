import type { FinancialPreparationRevision } from "../types/domain"

export function AdmissionFinancialHistory({
  revisions,
}: {
  revisions: FinancialPreparationRevision[]
}) {
  return (
    <section aria-labelledby="finance-history-title">
      <h2 id="finance-history-title" className="font-heading text-lg font-bold">
        سجل التجهيز المالي
      </h2>
      <ol className="mt-3 divide-y rounded-lg border">
        {[...revisions].reverse().map((revision) => (
          <li
            key={revision.id}
            className="flex flex-wrap justify-between gap-3 p-3 text-sm"
          >
            <span>الإصدار {revision.revisionNumber}</span>
            <span>
              <bdi dir="ltr">
                {revision.requiredAmount.amount}{" "}
                {revision.requiredAmount.currency}
              </bdi>
            </span>
            <span className="text-muted-foreground">
              <bdi dir="ltr">
                {new Date(revision.createdAt).toLocaleString("ar-EG")}
              </bdi>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
