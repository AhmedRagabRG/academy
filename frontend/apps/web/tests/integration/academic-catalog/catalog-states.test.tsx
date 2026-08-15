import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CatalogQueryState } from "@/features/academic-catalog/components/catalog-query-state"
describe("catalog query states", () => {
  it("renders safe recoverable failures", () => {
    render(
      <CatalogQueryState
        loading={false}
        error={new Error("تعذر الاتصال")}
        retry={() => undefined}
      >
        <p>content</p>
      </CatalogQueryState>
    )
    expect(screen.getByText("تعذر تحميل بيانات الكتالوج")).toBeInTheDocument()
    expect(screen.getByRole("button")).toBeEnabled()
  })
})
