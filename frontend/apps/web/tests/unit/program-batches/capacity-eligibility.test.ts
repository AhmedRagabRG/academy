import { describe, expect, it } from "vitest"
import { deriveCapacity } from "@/features/program-batches/utils/batch-capacity"
describe("batch capacity", () => {
  it("derives seats and never returns a negative value", () => {
    expect(deriveCapacity(30, 12)).toMatchObject({
      availableSeats: 18,
      state: "available",
    })
    expect(deriveCapacity(10, 12)).toMatchObject({
      availableSeats: 0,
      state: "over-capacity",
    })
  })
})
