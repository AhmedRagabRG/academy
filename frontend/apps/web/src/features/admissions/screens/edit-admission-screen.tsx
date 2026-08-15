"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { AdmissionId } from "../types/common"
import type { DraftAdmissionValues } from "../schemas/applicant-schema"
import { useAdmissionLookups } from "../hooks/use-admissions-list"
import {
  useAdmission,
  useUpdateAdmission,
} from "../hooks/use-admission-mutations"
import { useChangeAdmissionSelection } from "../hooks/use-admission-eligibility"
import { usePrepareAdmissionFinancials } from "../hooks/use-admission-finance"
import {
  AdmissionsPage,
  AdmissionQueryState,
} from "../components/admissions-page"
import { AdmissionEditor } from "../forms/admission-editor"

export function EditAdmissionScreen({
  admissionId: raw,
}: {
  admissionId: string
}) {
  const admissionId = raw as AdmissionId
  const router = useRouter(),
    detail = useAdmission(admissionId),
    lookups = useAdmissionLookups(),
    update = useUpdateAdmission(),
    changeSelection = useChangeAdmissionSelection(),
    prepareFinance = usePrepareAdmissionFinancials()
  /** The last refusal, so its field errors land on the form instead of crashing. */
  const [saveError, setSaveError] = useState<unknown>()
  const data = detail.data
  const initialValues: DraftAdmissionValues | undefined = data
    ? {
        applicant: {
          fullName: data.applicant.fullName,
          primaryPhone: data.applicant.primaryPhone,
          guardianPhone: data.applicant.guardianPhone ?? "",
          nationalId: data.applicant.nationalId ?? "",
          alternativeIdentityReason:
            data.applicant.alternativeIdentityReason ?? "",
          address: data.applicant.address,
          dateOfBirth: data.applicant.dateOfBirth,
          qualificationId: data.applicant.qualificationId,
          graduationYear: data.applicant.graduationYear,
          notes: data.applicant.notes,
          profileImageUrl: data.applicant.profileImageUrl ?? "",
        },
        assignment: {
          registrationBranchId: data.assignment.registrationBranchId,
          studyBranchId: data.assignment.studyBranchId,
          admissionsEmployeeId: data.assignment.admissionsEmployeeId,
          customerServiceEmployeeId: data.assignment.customerServiceEmployeeId,
          customerServiceManagerId: data.assignment.customerServiceManagerId,
          departmentId: data.assignment.departmentId,
          leadSourceId: data.assignment.leadSourceId,
          academicGradeId: data.assignment.academicGradeId,
        },
        selection: data.selection
          ? {
              offeringKind: data.selection.offeringKind,
              offeringId: data.selection.offeringId,
              batchId: data.selection.batchId,
            }
          : undefined,
        financial: data.financial
          ? {
              discountMode: data.financial.discountMode,
              discountValue:
                data.financial.discountMode === "percentage"
                  ? data.financial.discountPercentage
                  : data.financial.discountAmount.amount,
            }
          : { discountMode: "none", discountValue: "0" },
        notes: data.notes,
      }
    : undefined
  const save = async (values: DraftAdmissionValues) => {
    if (!data) return
    setSaveError(undefined)
    try {
      await applyChanges(values)
    } catch (error) {
      setSaveError(error)
    }
  }
  const applyChanges = async (values: DraftAdmissionValues) => {
    if (!data) return
    let current = await update.mutateAsync({
      admissionId,
      input: values,
      expectedVersion: data.version,
    })
    if (
      values.selection &&
      (values.selection.offeringId !== data.selection?.offeringId ||
        values.selection.batchId !== data.selection?.batchId)
    )
      current = await changeSelection.mutateAsync({
        admissionId,
        selection: values.selection,
        // The API accepts only these two consequence keys; anything else is
        // rejected outright as a validation error.
        confirmedConsequences: ["financial-recalculated", "documents-repolicied"],
        reason: "تحديث بيانات القبول",
        expectedVersion: current.version,
      })
    if (values.financial)
      current = await prepareFinance.mutateAsync({
        admissionId,
        input: values.financial,
        expectedVersion: current.version,
      })
    router.replace(`/admissions/${current.id}`)
  }
  return (
    <AdmissionsPage
      title="تعديل طلب القبول"
      description="تحديث بيانات المسودة مع الحفاظ على تاريخ الاختيار والتجهيز المالي."
      permission="admissions.update"
    >
      <AdmissionQueryState
        loading={detail.isLoading || lookups.isLoading}
        error={detail.error ?? lookups.error}
        onRetry={() => void detail.refetch()}
      >
        {data && lookups.data && initialValues && (
          <AdmissionEditor
            lookups={lookups.data}
            initialValues={initialValues}
            pending={
              update.isPending ||
              changeSelection.isPending ||
              prepareFinance.isPending
            }
            error={
              saveError ??
              update.error ??
              changeSelection.error ??
              prepareFinance.error
            }
            onSubmit={save}
          />
        )}
      </AdmissionQueryState>
    </AdmissionsPage>
  )
}
