import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  ProductEditorForm,
  emptyProductValues,
} from "@/features/academic-catalog/forms/product-editor-form"
// eslint-disable-next-line no-restricted-imports
import {
  catalogLookups,
  categories,
  productTypes,
} from "@/features/academic-catalog/data/catalog-fixtures"
describe("product editor", () => {
  it("renders one accessible sectioned form", () => {
    render(
      <ProductEditorForm
        values={emptyProductValues}
        types={productTypes}
        categories={categories}
        lookups={catalogLookups}
        pending={false}
        onSubmit={() => undefined}
      />
    )
    expect(
      screen.getByRole("navigation", { name: "أقسام المنتج" })
    ).toBeInTheDocument()
    expect(screen.getByLabelText("الاسم الرسمي")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "حفظ المنتج" })).toBeEnabled()
  })
})
