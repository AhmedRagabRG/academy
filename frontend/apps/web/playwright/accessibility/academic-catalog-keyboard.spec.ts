import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
test("catalog editor exposes keyboard focus and semantic sections", async ({
  page,
}) => {
  await signIn(page)
  await page.goto("/academic-catalog/products/product-leadership/edit")
  await page.keyboard.press("Tab")
  await expect(page.locator(":focus-visible")).toBeVisible()
  await expect(
    page.locator('[aria-label="أقسام المنتج"]:visible')
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "حفظ المنتج" })).toBeVisible()
})
