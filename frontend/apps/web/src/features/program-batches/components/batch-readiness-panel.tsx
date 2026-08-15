import { Card } from "@/shared/components/layout/card"
import type { Readiness } from "../types/domain"
export function BatchReadinessPanel({ readiness }: { readiness: Readiness }) {
  return (
    <Card>
      <h2 className="font-heading text-lg font-bold">جاهزية فتح التسجيل</h2>
      {readiness.ready ? (
        <p className="mt-2 text-emerald-700">الدفعة جاهزة لفتح التسجيل.</p>
      ) : (
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-destructive">
          {readiness.findings.map((x) => (
            <li key={x.code}>{x.message}</li>
          ))}
        </ul>
      )}
    </Card>
  )
}
