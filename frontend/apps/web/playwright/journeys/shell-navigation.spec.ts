import { expect, test } from "@playwright/test"
test.beforeEach(async ({ page }) => { await page.goto("/login"); await page.getByLabel("البريد الإلكتروني").fill("employee@alsalam.edu"); await page.locator("#password").fill("demo1234"); await page.getByRole("button", { name: "تسجيل الدخول" }).click(); await expect(page).toHaveURL(/dashboard/) })
test("navigation opens a business module", async ({ page }) => {
  const link = page.getByRole("link", { name: "الطلاب" }).first()
  if (!(await link.isVisible()))
    await page.getByRole("button", { name: "فتح التنقل" }).click()
  await link.click()
  await expect(page.getByRole("heading", { name: "الطلاب" })).toBeVisible()
})
