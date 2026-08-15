import { Card } from "@/shared/components/layout/card"
import type { Eligibility } from "../types/domain"
export function BatchEligibilityPanel({
  eligibility,
}: {
  eligibility: Eligibility
}) {
  return (
    <Card>
      <h2 className="font-bold">أهلية التسجيل</h2>
      <p
        className={
          eligibility.eligible
            ? "mt-2 text-emerald-700"
            : "mt-2 text-destructive"
        }
      >
        {eligibility.eligible ? "مؤهلة للتسجيل" : "غير مؤهلة للتسجيل"}
      </p>
      {eligibility.reasons.length > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          {eligibility.reasons.join(" · ")}
        </p>
      )}
    </Card>
  )
}
