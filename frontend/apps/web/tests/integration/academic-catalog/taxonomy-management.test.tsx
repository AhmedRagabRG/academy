import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CategoryForm } from "@/features/academic-catalog/forms/category-form"
describe("taxonomy forms", () => {
  it("labels category inputs", () => {
    render(<CategoryForm pending={false} onSubmit={() => undefined} />)
    expect(screen.getByLabelText("الاسم بالعربية")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "حفظ التغييرات" })).toBeEnabled()
  })
})
