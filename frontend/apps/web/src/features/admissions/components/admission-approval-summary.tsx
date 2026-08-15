import { Card } from "@/shared/components/layout/card"
import type {
  AdmissionApprovalSnapshot,
  EnrollmentReadinessSummary,
} from "../types/domain"

export function AdmissionApprovalSummary({
  snapshot,
  readiness,
}: {
  snapshot?: AdmissionApprovalSnapshot
  readiness?: EnrollmentReadinessSummary
}) {
  if (!snapshot) return null
  return (
    <Card className="space-y-3">
      <h2 className="font-heading text-lg font-bold">ملخص قرار القبول</h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">رقم اللقطة</dt>
          <dd>
            <bdi dir="ltr">{snapshot.id}</bdi>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">تاريخ القبول</dt>
          <dd>
            <bdi dir="ltr">
              {new Date(snapshot.approvedAt).toLocaleDateString("ar-EG")}
            </bdi>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">المبلغ المطلوب</dt>
          <dd>
            <bdi dir="ltr">
              {snapshot.financial.requiredAmount.amount}{" "}
              {snapshot.financial.requiredAmount.currency}
            </bdi>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">جاهزية التسجيل</dt>
          <dd>{readiness?.ready ? "جاهز" : "غير جاهز"}</dd>
        </div>
      </dl>
    </Card>
  )
}
