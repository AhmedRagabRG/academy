import { expect, test } from "@playwright/test"
import { openProgramBatches } from "../helpers/program-batches"
test("capacity and eligibility are visible", async ({ page }) => {
  await openProgramBatches(page, "/batch-fall-2026")
  await expect(page.getByText(/18 \/ 30/).first()).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "أهلية التسجيل" })
  ).toBeVisible()
})
