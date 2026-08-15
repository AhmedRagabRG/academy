"use client"
import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import type { ProgramBatchId, ProgramId } from "../types/common"
import { ProgramBatchPage } from "../components/program-batch-page"
import { BatchQueryState } from "../components/program-batch-query-state"
import { ProgramBatchDetails } from "../components/program-batch-details"
import { BatchPermission } from "../components/program-batch-permission-boundary"
import { BatchLifecycleActions } from "../components/batch-lifecycle-actions"
import { BatchReadinessPanel } from "../components/batch-readiness-panel"
import { BatchLifecycleHistory } from "../components/batch-lifecycle-history"
import { BatchFinancialHistory } from "../components/batch-financial-history"
import { BatchEligibilityPanel } from "../components/batch-eligibility-panel"
import { useBatch } from "../hooks/use-program-batches"
import {
  useBatchLifecycle,
  useBatchReadiness,
} from "../hooks/use-batch-lifecycle"
import { useBatchRevisions } from "../hooks/use-batch-financials"
import { useBatchEligibility } from "../hooks/use-batch-operations"
export function ProgramBatchDetailScreen({
  programId: raw,
  batchId: bid,
}: {
  programId: string
  batchId: string
}) {
  const programId = raw as ProgramId,
    batchId = bid as ProgramBatchId,
    batch = useBatch(programId, batchId),
    ready = useBatchReadiness(programId, batchId),
    history = useBatchLifecycle(batchId),
    revisions = useBatchRevisions(batchId),
    eligibility = useBatchEligibility(batchId, "branch-cairo")
  return (
    <ProgramBatchPage
      title="تفاصيل الدفعة"
      description="السجل التشغيلي والأكاديمي والمالي للدفعة."
      actions={
        <BatchPermission permission="batches.update">
          <Button
            nativeButton={false}
            render={
              <Link
                href={`/academic-catalog/programs/${programId}/batches/${batchId}/edit`}
              />
            }
          >
            تعديل الدفعة
          </Button>
        </BatchPermission>
      }
    >
      <BatchQueryState
        loading={batch.isLoading || ready.isLoading}
        error={batch.error ?? ready.error}
      >
        {batch.data && ready.data && (
          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-2xl font-bold text-brand-navy dark:text-foreground">
                    {batch.data.name.ar}
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    {batch.data.programName} · {batch.data.academicYearName} ·{" "}
                    {batch.data.intakeName}
                  </p>
                </div>
                <BatchLifecycleActions batch={batch.data} />
              </div>
            </Card>
            <ProgramBatchDetails batch={batch.data} />
            <BatchReadinessPanel readiness={ready.data} />
            {eligibility.data && (
              <BatchEligibilityPanel eligibility={eligibility.data} />
            )}
            <Card>
              <h2 className="font-bold">الجدول الأكاديمي</h2>
              <p className="mt-3">
                <bdi dir="ltr">
                  {batch.data.schedule.registrationStartDate} —{" "}
                  {batch.data.schedule.registrationEndDate}
                </bdi>{" "}
                · التسجيل
              </p>
              <p>
                <bdi dir="ltr">
                  {batch.data.schedule.studyStartDate} —{" "}
                  {batch.data.schedule.studyEndDate}
                </bdi>{" "}
                · الدراسة
              </p>
            </Card>
            {history.data && <BatchLifecycleHistory events={history.data} />}{" "}
            {revisions.data && (
              <BatchFinancialHistory revisions={revisions.data} />
            )}
          </div>
        )}
      </BatchQueryState>
    </ProgramBatchPage>
  )
}
