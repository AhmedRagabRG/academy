import { describe, expect, it } from "vitest"
import {
  installmentPlanSchema,
  offerSchema,
} from "@/features/program-batches/schemas/batch-financial-schema"
describe("batch finances", () => {
  it("rejects invalid percentages and accepts ordered plans", () => {
    expect(
      offerSchema.safeParse({
        id: "1",
        kind: "discount",
        name: "خصم",
        valueType: "percentage",
        value: "101",
        status: "active",
      }).success
    ).toBe(false)
    expect(
      installmentPlanSchema.safeParse({
        id: "p",
        name: "خطة",
        basis: "percentage",
        coveredCharge: "combined",
        status: "active",
        installments: [
          {
            id: "i",
            label: "أولى",
            value: "100",
            milestoneId: "study-start",
            position: 0,
          },
        ],
      }).success
    ).toBe(true)
  })
})
