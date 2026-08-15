import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { FormProvider, useForm } from "react-hook-form"
import { BatchBasicSection } from "@/features/program-batches/forms/batch-basic-section"
import type { BatchLookups } from "@/features/program-batches/types/domain"
const lookups = {
  academicYears: [{ value: "y", label: "عام" }],
  intakes: [{ value: "i", label: "قبول" }],
} as BatchLookups
function Form() {
  const form = useForm({
    defaultValues: {
      name: { ar: "" },
      code: "",
      academicYearId: "",
      intakeId: "",
      description: "",
    },
  })
  return (
    <FormProvider {...form}>
      <BatchBasicSection lookups={lookups} />
    </FormProvider>
  )
}
describe("batch editor", () => {
  it("renders one accessible basic section", () => {
    render(<Form />)
    expect(
      screen.getByRole("group", { name: "المعلومات الأساسية" })
    ).toBeVisible()
    expect(screen.getByLabelText("رمز الدفعة")).toHaveAttribute("dir", "ltr")
  })
})
