import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
test("product editor separates branch roles", async ({ page }) => {
  await signIn(page)
  await page.goto("/academic-catalog/products/product-leadership/edit")
  await expect(page.getByRole("group", { name: "فروع التسجيل" })).toBeVisible()
  await expect(page.getByRole("group", { name: "فروع الدراسة" })).toBeVisible()
})
