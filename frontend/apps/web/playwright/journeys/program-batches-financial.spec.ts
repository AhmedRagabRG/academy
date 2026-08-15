import { expect, test } from "@playwright/test"
import { openProgramBatches } from "../helpers/program-batches"
test("financial editor and history are available", async ({ page }) => {
  await openProgramBatches(page, "/batch-fall-2026/edit")
  await expect(
    page.getByRole("group", { name: "الإعدادات المالية" })
  ).toBeVisible()
  await page.goto(
    "/academic-catalog/programs/product-professional/batches/batch-fall-2026"
  )
  await expect(
    page.getByRole("heading", { name: "مراجعات التسعير" })
  ).toBeVisible()
})
