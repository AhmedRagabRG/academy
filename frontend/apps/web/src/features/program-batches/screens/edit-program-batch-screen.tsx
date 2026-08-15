"use client"
import type { ProgramBatchId, ProgramId } from "../types/common"
import { ProgramBatchPage } from "../components/program-batch-page"
import { BatchQueryState } from "../components/program-batch-query-state"
import { ProgramBatchEditor } from "../forms/program-batch-editor"
import { useBatch, useBatchLookups } from "../hooks/use-program-batches"
import { useBatchMutations } from "../hooks/use-program-batch-mutations"
export function EditProgramBatchScreen({
  programId: raw,
  batchId: bid,
}: {
  programId: string
  batchId: string
}) {
  const programId = raw as ProgramId,
    batchId = bid as ProgramBatchId,
    batch = useBatch(programId, batchId),
    lookups = useBatchLookups(programId),
    mutation = useBatchMutations().update
  return (
    <ProgramBatchPage
      permission="batches.update"
      title="تعديل الدفعة"
      description="حدّث إعدادات الدفعة مع الحفاظ على سجلها."
    >
      <BatchQueryState
        loading={batch.isLoading || lookups.isLoading}
        error={batch.error ?? lookups.error}
      >
        {batch.data && lookups.data && (
          <ProgramBatchEditor
            key={batch.data.version}
            lookups={lookups.data}
            capacity={batch.data.capacity}
            locked={batch.data.codeLocked}
            pending={mutation.isPending}
            values={{
              name: batch.data.name,
              code: batch.data.code,
              academicYearId: batch.data.academicYearId,
              intakeId: batch.data.intakeId,
              description: batch.data.description,
              schedule: batch.data.schedule,
              maximumStudents: batch.data.capacity.maximumStudents,
              financialProfile: batch.data.financialProfile,
              branchAssignments: batch.data.branchAssignments,
            }}
            onSubmit={(input) =>
              mutation.mutate({
                programId,
                batchId,
                input,
                expectedVersion: batch.data.version,
              })
            }
          />
        )}
      </BatchQueryState>
    </ProgramBatchPage>
  )
}
