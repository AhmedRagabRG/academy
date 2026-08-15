import { CircleAlert, CircleCheck } from "lucide-react"
import { Card } from "@/shared/components/layout/card"
import type { AdmissionReadiness } from "../types/domain"

export function AdmissionReadinessPanel({
  readiness,
}: {
  readiness: AdmissionReadiness
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className={`grid size-9 place-items-center rounded-full ${readiness.ready ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
        >
          {readiness.ready ? (
            <CircleCheck aria-hidden />
          ) : (
            <CircleAlert aria-hidden />
          )}
        </span>
        <div>
          <h2 className="font-heading font-bold">
            {readiness.action === "approve"
              ? "جاهزية القبول"
              : "جاهزية التقديم"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {readiness.ready
              ? "جميع المتطلبات مكتملة"
              : `${readiness.findings.length} متطلبات تحتاج المراجعة`}
          </p>
        </div>
      </div>
      {readiness.findings.length > 0 && (
        <ul className="space-y-2">
          {/*
            Section and code do not identify a finding: the same code repeats
            per offending item — one `document-missing` for each missing
            document — so the position completes the key.
          */}
          {readiness.findings.map((finding, index) => (
            <li
              key={`${finding.section}-${finding.code}-${finding.field ?? index}`}
              className="rounded-lg bg-muted/60 px-3 py-2 text-sm"
            >
              {finding.message}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
