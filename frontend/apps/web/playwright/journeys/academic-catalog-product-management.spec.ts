import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
test("catalog product list detail and editor are reachable", async ({
  page,
}) => {
  await signIn(page)
  await page.goto("/academic-catalog/products")
  await expect(
    page.getByRole("heading", { name: "المنتجات الأكاديمية" })
  ).toBeVisible()
  await page.getByRole("link", { name: "دبلوم القيادة التنفيذية" }).click()
  await expect(
    page.getByRole("heading", { name: "دبلوم القيادة التنفيذية" })
  ).toBeVisible()
  await page.getByRole("link", { name: "تعديل المنتج" }).click()
  await expect(page.getByRole("button", { name: "حفظ المنتج" })).toBeVisible()
})
