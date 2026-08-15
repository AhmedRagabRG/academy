import { expect, test } from "@playwright/test"
import { openProgramBatches } from "../helpers/program-batches"
test("batch list detail and editor are reachable", async ({ page }) => {
  await openProgramBatches(page)
  await expect(
    page.getByRole("heading", { name: "دفعات البرنامج" })
  ).toBeVisible()
  await page.getByRole("link", { name: "دفعة خريف 2026" }).click()
  await expect(
    page.getByRole("heading", { name: "دفعة خريف 2026" })
  ).toBeVisible()
  await page.getByRole("link", { name: "تعديل الدفعة" }).click()
  await expect(page.getByRole("button", { name: "حفظ الدفعة" })).toBeVisible()
})
