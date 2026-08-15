import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ProgramBatchToolbar } from "@/features/program-batches/components/program-batch-toolbar"
import type { BatchLookups } from "@/features/program-batches/types/domain"
describe("batch filters", () => {
  it("uses the shared labelled dropdowns", () => {
    render(
      <ProgramBatchToolbar
        query={{ page: 1, pageSize: 10, status: "all" }}
        lookups={
          {
            academicYears: [],
            intakes: [],
            branches: [],
          } as unknown as BatchLookups
        }
        onChange={() => undefined}
      />
    )
    expect(screen.getByLabelText("الحالة")).toBeVisible()
    expect(screen.getByLabelText("الفرع")).toBeVisible()
  })
})
