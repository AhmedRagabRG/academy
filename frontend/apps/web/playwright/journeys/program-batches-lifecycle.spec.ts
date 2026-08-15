import { expect, test } from "@playwright/test"
import { openProgramBatches } from "../helpers/program-batches"
test("batch lifecycle is explained", async ({ page }) => {
  await openProgramBatches(page, "/batch-fall-2026")
  await expect(
    page.getByRole("heading", { name: "جاهزية فتح التسجيل" })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "سجل دورة الحياة" })
  ).toBeVisible()
})
