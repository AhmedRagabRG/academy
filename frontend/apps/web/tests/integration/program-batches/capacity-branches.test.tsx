import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { BatchCapacityIndicator } from "@/features/program-batches/components/batch-capacity-indicator"
describe("capacity indicator", () => {
  it("communicates full capacity with text", () => {
    render(
      <BatchCapacityIndicator
        capacity={{
          maximumStudents: 10,
          currentStudents: 10,
          availableSeats: 0,
          state: "full",
        }}
      />
    )
    expect(screen.getByText("مكتملة")).toBeVisible()
    expect(screen.getByText(/0 \/ 10/)).toBeVisible()
  })
})
