import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FormProvider, useForm } from "react-hook-form"
import { ProductAvailabilitySection } from "@/features/academic-catalog/forms/product-availability-section"
import { emptyProductValues } from "@/features/academic-catalog/forms/product-editor-form"
// eslint-disable-next-line no-restricted-imports
import { catalogLookups } from "@/features/academic-catalog/data/catalog-fixtures"
function Subject() {
  const form = useForm({ defaultValues: emptyProductValues })
  return (
    <FormProvider {...form}>
      <ProductAvailabilitySection lookups={catalogLookups} />
    </FormProvider>
  )
}
describe("product availability", () => {
  it("separates registration study and general branch roles", () => {
    render(<Subject />)
    expect(
      screen.getByRole("group", { name: "فروع التسجيل" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("group", { name: "فروع الدراسة" })
    ).toBeInTheDocument()
  })
})
