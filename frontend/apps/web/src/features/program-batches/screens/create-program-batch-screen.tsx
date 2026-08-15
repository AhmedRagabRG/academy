"use client"
import { useRouter } from "next/navigation"
import type { FinancialRevisionId, ProgramId } from "../types/common"
import { ProgramBatchPage } from "../components/program-batch-page"
import { BatchQueryState } from "../components/program-batch-query-state"
import { ProgramBatchEditor } from "../forms/program-batch-editor"
import { useBatchLookups } from "../hooks/use-program-batches"
import { useBatchMutations } from "../hooks/use-program-batch-mutations"
import type { ProgramBatchFormValues } from "../schemas/program-batch-schema"
import { zeroBatchMoney } from "../utils/batch-money"
export function CreateProgramBatchScreen({
  programId: raw,
}: {
  programId: string
}) {
  const programId = raw as ProgramId,
    lookups = useBatchLookups(programId),
    mutation = useBatchMutations().create,
    router = useRouter()
  const values: ProgramBatchFormValues = {
    name: { ar: "", en: "" },
    code: "",
    academicYearId: "",
    intakeId: "",
    description: "",
    schedule: {
      registrationStartDate: "",
      registrationEndDate: "",
      studyStartDate: "",
      studyEndDate: "",
      graduationDate: "",
    },
    maximumStudents: 30,
    financialProfile: {
      programPrice: zeroBatchMoney(),
      registrationFee: zeroBatchMoney(),
      installmentsEnabled: false,
      installmentPlans: [],
      offers: [],
      currentRevisionId: "new" as FinancialRevisionId,
    },
    branchAssignments: [],
  }
  return (
    <ProgramBatchPage
      permission="batches.create"
      title="إنشاء دفعة"
      description="أنشئ دفعة مستقلة مرتبطة بالبرنامج المهني."
    >
      <BatchQueryState loading={lookups.isLoading} error={lookups.error}>
        {lookups.data && (
          <ProgramBatchEditor
            lookups={lookups.data}
            values={values}
            pending={mutation.isPending}
            onSubmit={(input) =>
              mutation.mutate(
                { programId, input },
                {
                  onSuccess: (b) =>
                    router.replace(
                      `/academic-catalog/programs/${programId}/batches/${b.id}`
                    ),
                }
              )
            }
          />
        )}
      </BatchQueryState>
    </ProgramBatchPage>
  )
}
