import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { DataTable } from "@/shared/components/data-table/data-table"
import { productColumns } from "@/features/academic-catalog/config/product-table"
describe("catalog product list", () => {
  it("exposes controlled empty state and totals", () => {
    render(
      <DataTable
        data={[]}
        columns={productColumns}
        controlled={{
          search: "",
          page: 1,
          pageSize: 10,
          total: 0,
          totalPages: 1,
          onSearchChange: () => undefined,
          onPageChange: () => undefined,
        }}
      />
    )
    expect(screen.getByText("لا توجد بيانات")).toBeInTheDocument()
    expect(screen.getByText(/0 سجل/)).toBeInTheDocument()
  })
})
