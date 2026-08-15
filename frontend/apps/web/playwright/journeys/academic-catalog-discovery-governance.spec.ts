import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
test("catalog discovery supports search status and sorting", async ({
  page,
}) => {
  await signIn(page)
  await page.goto("/academic-catalog/products")
  await page.getByRole("searchbox").fill("ALP-001")
  await expect(page.getByText("دبلوم القيادة التنفيذية")).toBeVisible()
  await expect(page.getByLabel("الحالة")).toBeVisible()
  await expect(page.getByLabel("الترتيب")).toBeVisible()
})
