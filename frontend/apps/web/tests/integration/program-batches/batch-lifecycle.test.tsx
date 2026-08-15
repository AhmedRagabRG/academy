import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { BatchReadinessPanel } from "@/features/program-batches/components/batch-readiness-panel"
describe("batch lifecycle presentation", () => {
  it("explains readiness findings", () => {
    render(
      <BatchReadinessPanel
        readiness={{
          ready: false,
          batchVersion: 1,
          findings: [
            {
              code: "schedule",
              section: "schedule",
              message: "أكمل الجدول الأكاديمي",
            },
          ],
        }}
      />
    )
    expect(screen.getByText("أكمل الجدول الأكاديمي")).toBeVisible()
  })
})
