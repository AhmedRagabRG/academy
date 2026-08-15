"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { ApplicantId } from "../types/common"
import type { DraftAdmissionInput } from "../types/commands"
import { admissionsService } from "../services/active-admissions-service"
import { useAdmissionLookups } from "../hooks/use-admissions-list"
import { useCreateAdmission } from "../hooks/use-admission-mutations"
import {
  AdmissionsPage,
  AdmissionQueryState,
} from "../components/admissions-page"
import { AdmissionEditor } from "../forms/admission-editor"
import {
  DuplicateApplicantDialog,
  type DuplicateCandidateView,
} from "../components/duplicate-applicant-dialog"

export function CreateAdmissionScreen() {
  const router = useRouter(),
    lookups = useAdmissionLookups(),
    create = useCreateAdmission()
  const [pendingInput, setPendingInput] = useState<DraftAdmissionInput>()
  const [duplicates, setDuplicates] = useState<DuplicateCandidateView[]>([])
  /**
   * The last refusal, from either step of the save.
   *
   * The duplicate check runs before the mutation and validates the applicant
   * against the same rules, so it can be refused on its own. Its rejection is
   * not the mutation's, and left unhandled it surfaced as a crash instead of
   * marking the field it named.
   */
  const [saveError, setSaveError] = useState<unknown>()
  const save = async (
    input: DraftAdmissionInput,
    duplicateResolution?: {
      outcome: "use-existing" | "create-exception"
      applicantId?: ApplicantId
      reason?: string
    }
  ) => {
    setSaveError(undefined)
    try {
      if (!duplicateResolution) {
        const candidates = await admissionsService.findDuplicates(
          input.applicant
        )
        if (candidates.length) {
          setPendingInput(input)
          setDuplicates(candidates)
          return
        }
      }
      const detail = await create.mutateAsync({ input, duplicateResolution })
      router.replace(`/admissions/${detail.id}`)
    } catch (error) {
      setSaveError(error)
    }
  }
  return (
    <AdmissionsPage
      title="تسجيل متقدم"
      description="إنشاء هوية متقدم وطلب قبول منفصل قابل للاستكمال."
      permission="admissions.create"
    >
      <AdmissionQueryState loading={lookups.isLoading} error={lookups.error}>
        {lookups.data && (
          <AdmissionEditor
            lookups={lookups.data}
            pending={create.isPending}
            error={saveError ?? create.error}
            onSubmit={save}
          />
        )}
      </AdmissionQueryState>
      {pendingInput && duplicates.length > 0 && (
        <DuplicateApplicantDialog
          candidates={duplicates}
          onCancel={() => {
            setPendingInput(undefined)
            setDuplicates([])
          }}
          onUseExisting={(id) =>
            void save(pendingInput, {
              outcome: "use-existing",
              applicantId: id as ApplicantId,
            })
          }
          onCreateException={(reason) =>
            void save(pendingInput, { outcome: "create-exception", reason })
          }
        />
      )}
    </AdmissionsPage>
  )
}
