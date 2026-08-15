import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { DataTable } from "@/shared/components/data-table/data-table"
describe("controlled administrative table", () => { it("renders totals and empty guidance", () => { render(<DataTable data={[]} columns={[]} controlled={{ search: "", page: 1, pageSize: 10, total: 0, totalPages: 1, onSearchChange: () => undefined, onPageChange: () => undefined }} />); expect(screen.getByText("لا توجد بيانات")).toBeInTheDocument(); expect(screen.getByText(/0 سجل/)).toBeInTheDocument() }) })
