import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
test("product types and categories are configurable", async ({ page }) => {
  await signIn(page)
  await page.goto("/academic-catalog/product-types")
  await expect(
    page.getByRole("heading", { name: "أنواع المنتجات" })
  ).toBeVisible()
  await expect(page.getByText("برنامج مهني")).toBeVisible()
  await page.goto("/academic-catalog/categories")
  await expect(page.getByText("إدارة الأعمال")).toBeVisible()
})
