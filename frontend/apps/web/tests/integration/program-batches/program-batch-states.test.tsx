import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { BatchQueryState } from "@/features/program-batches/components/program-batch-query-state"
describe("batch query states", () => {
  it("renders a recoverable safe error", () => {
    render(
      <BatchQueryState loading={false} error={new Error("الخدمة غير متاحة")}>
        <span>data</span>
      </BatchQueryState>
    )
    expect(screen.getByRole("alert")).toHaveTextContent("الخدمة غير متاحة")
  })
})
