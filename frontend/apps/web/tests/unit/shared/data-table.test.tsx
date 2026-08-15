import { render, screen } from "@testing-library/react"
import type { ColumnDef } from "@tanstack/react-table"
import { describe, expect, it } from "vitest"
import { DataTable } from "@/shared/components/data-table/data-table"

describe("DataTable", () => {
  it("renders typed rows", () => {
    const columns: ColumnDef<{ name: string }>[] = [{ accessorKey: "name", header: "الاسم" }]
    render(<DataTable data={[{ name: "سجل" }]} columns={columns} />)
    expect(screen.getByText("سجل")).toBeInTheDocument()
  })
  it("renders its empty state", () => {
    render(<DataTable data={[]} columns={[]} />)
    expect(screen.getByText("لا توجد بيانات")).toBeInTheDocument()
  })
})
