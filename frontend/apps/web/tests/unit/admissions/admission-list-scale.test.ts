import { describe, expect, it } from "vitest"
import { createAdmissionScaleSummaries } from "@/features/admissions/data/admissions-scale-fixtures"

describe("admission scale fixtures", () => {
  it("creates 10,000 narrow deterministic summaries within the service goal", () => {
    const startedAt = performance.now()
    const records = createAdmissionScaleSummaries()
    expect(records).toHaveLength(10_000)
    expect(records[7_776]?.applicantName).toBe("هدف البحث المؤكد")
    expect(performance.now() - startedAt).toBeLessThan(2_000)
  })
})
