"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { Save } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary"
import { TextareaField } from "@/shared/components/forms/textarea-field"
import type { AdmissionLookups } from "../types/domain"
import type { DraftAdmissionInput } from "../types/commands"
import {
  draftAdmissionSchema,
  type DraftAdmissionValues,
} from "../schemas/applicant-schema"
import { applyAdmissionFieldErrors } from "../utils/admission-field-errors"
import { ApplicantInformationSection } from "./applicant-information-section"
import { AdmissionAssignmentSection } from "./admission-assignment-section"
import { AcademicOfferingField } from "./academic-offering-field"
import { ProgramBatchField } from "./program-batch-field"
import { AdmissionFinanceSection } from "./admission-finance-section"

export const emptyAdmissionValues = (
  lookups: AdmissionLookups
): DraftAdmissionValues => {
  // Default to the first offering and to branches and a batch it will accept,
  // so a form opened and saved without edits is not refused on arrival.
  const offering = lookups.offerings[0]
  const branchFor = (allowed: string[] | undefined) =>
    lookups.branches.find((branch) => !allowed?.length || allowed.includes(branch.value))
      ?.value ?? lookups.branches[0]?.value ?? ""
  const batch =
    lookups.batches.find(
      (item) =>
        item.programId === offering?.id &&
        item.status === "registration-open" &&
        item.availableSeats > 0
    ) ?? lookups.batches.find((item) => item.programId === offering?.id)
  return {
  applicant: {
    fullName: "",
    primaryPhone: "",
    guardianPhone: "",
    nationalId: "",
    alternativeIdentityReason: "",
    address: "",
    dateOfBirth: "1998-01-01",
    qualificationId: lookups.qualifications[0]?.value ?? "",
    graduationYear: new Date().getFullYear(),
    notes: "",
    profileImageUrl: "",
  },
  assignment: {
    registrationBranchId: branchFor(offering?.registrationBranchIds),
    studyBranchId: branchFor(offering?.studyBranchIds),
    admissionsEmployeeId: lookups.employees[0]?.value ?? "",
    customerServiceEmployeeId: lookups.employees[0]?.value ?? "",
    customerServiceManagerId: lookups.managers[0]?.value ?? "",
    departmentId: lookups.departments[0]?.value ?? "",
    leadSourceId: lookups.leadSources[0]?.value ?? "",
    academicGradeId: lookups.academicGrades[0]?.value,
  },
  selection: {
    offeringKind: offering?.kind ?? "professional-program",
    offeringId: offering?.id ?? "",
    batchId: batch?.id,
  },
  financial: { discountMode: "none", discountValue: "0" },
  notes: "",
  }
}

export function AdmissionEditor({
  lookups,
  initialValues,
  pending = false,
  error,
  onSubmit,
}: {
  lookups: AdmissionLookups
  initialValues?: DraftAdmissionValues
  pending?: boolean
  /** The rejection from the last save, so its field errors land on the inputs. */
  error?: unknown
  onSubmit: (values: DraftAdmissionInput) => Promise<void> | void
}) {
  const methods = useForm<DraftAdmissionValues>({
    resolver: zodResolver(draftAdmissionSchema),
    defaultValues: initialValues ?? emptyAdmissionValues(lookups),
  })
  const { setError } = methods
  useEffect(() => {
    if (error) applyAdmissionFieldErrors(error, setError)
  }, [error, setError])
  useEffect(() => {
    const protectUnsavedChanges = (event: BeforeUnloadEvent) => {
      if (!methods.formState.isDirty || methods.formState.isSubmitSuccessful)
        return
      event.preventDefault()
    }
    window.addEventListener("beforeunload", protectUnsavedChanges)
    return () =>
      window.removeEventListener("beforeunload", protectUnsavedChanges)
  }, [methods.formState.isDirty, methods.formState.isSubmitSuccessful])
  return (
    <FormProvider {...methods}>
      <form
        className="space-y-6"
        noValidate
        onSubmit={methods.handleSubmit(
          (values) => onSubmit(values),
          (fieldErrors) => {
            const firstSection = Object.keys(fieldErrors)[0]
            const firstField = ({
              applicant: "applicant.fullName",
              assignment: "assignment.registrationBranchId",
              selection: "selection.offeringId",
              financial: "financial.discountValue",
              notes: "notes",
            } as const)[firstSection as "applicant" | "assignment" | "selection" | "financial" | "notes"]
            if (firstField) methods.setFocus(firstField)
          }
        )}
      >
        <FormErrorSummary
          errors={methods.formState.errors}
          submitCount={methods.formState.submitCount}
        />
        <Card>
          <ApplicantInformationSection lookups={lookups} />
        </Card>
        <Card>
          <AdmissionAssignmentSection lookups={lookups} />
        </Card>
        <Card>
          <fieldset className="space-y-5">
            <legend className="font-heading text-lg font-bold text-brand-navy dark:text-foreground">
              الاختيار الأكاديمي
            </legend>
            <div className="grid gap-5 md:grid-cols-2">
              <AcademicOfferingField lookups={lookups} />
              <ProgramBatchField lookups={lookups} />
            </div>
          </fieldset>
        </Card>
        <Card>
          <AdmissionFinanceSection lookups={lookups} />
        </Card>
        <Card>
          <TextareaField name="notes" label="ملاحظات داخلية" />
        </Card>
        <div className="sticky bottom-4 z-10 flex justify-end rounded-lg border bg-card/95 p-3 shadow-lg backdrop-blur">
          <Button type="submit" size="lg" disabled={pending}>
            <Save aria-hidden />
            {pending ? "جارٍ الحفظ..." : "حفظ الطلب"}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
