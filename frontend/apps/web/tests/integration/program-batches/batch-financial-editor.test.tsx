import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { FormProvider, useForm } from "react-hook-form"
import { BatchFinancialSection } from "@/features/program-batches/forms/batch-financial-section"
function Form() {
  const form = useForm({
    defaultValues: {
      financialProfile: {
        programPrice: { amount: "0" },
        registrationFee: { amount: "0" },
        installmentsEnabled: false,
      },
    },
  })
  return (
    <FormProvider {...form}>
      <BatchFinancialSection />
    </FormProvider>
  )
}
describe("financial editor", () => {
  it("labels money and installment inputs", () => {
    render(<Form />)
    expect(screen.getByLabelText("سعر البرنامج")).toHaveAttribute("dir", "ltr")
    expect(screen.getByLabelText("التقسيط متاح")).toBeVisible()
  })
})
