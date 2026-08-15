import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { openProgramBatches } from "../helpers/program-batches"
for (const path of ["", "/batch-fall-2026", "/batch-fall-2026/edit"]) {
  test(`batch route ${path || "list"} has no serious accessibility violations`, async ({
    page,
  }) => {
    await openProgramBatches(page, path)
    expect(
      (await new AxeBuilder({ page }).analyze()).violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      )
    ).toEqual([])
  })
}
