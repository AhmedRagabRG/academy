import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
test("sales and marketing sections remain accessible", async ({ page }) => {
  await signIn(page)
  await page.goto("/academic-catalog/products/product-leadership/edit")
  await expect(
    page.getByRole("heading", { name: "معلومات المبيعات" })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "معلومات التسويق" })
  ).toBeVisible()
  await expect(page.getByText(/اسحب الملفات هنا/)).toBeVisible()
})
