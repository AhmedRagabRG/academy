import { expect, test } from "@playwright/test"

test("Arabic RTL layout remains reachable across supported viewports", async ({ page }) => {
  await page.goto("/login")
  await expect(page.locator("html")).toHaveAttribute("lang", "ar")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.getByLabel("البريد الإلكتروني").fill("employee@alsalam.edu")
  await page.locator("#password").fill("demo1234")
  await page.getByRole("button", { name: "تسجيل الدخول" }).click()
  await expect(page).toHaveURL(/dashboard/)
  if ((page.viewportSize()?.width ?? 1200) < 1024) {
    const trigger = page.getByRole("button", { name: "فتح التنقل" })
    await trigger.click()
    await expect(page.getByRole("dialog", { name: "التنقل" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(trigger).toBeFocused()
  }
  await page.evaluate(() => { document.body.style.zoom = "2" })
  await expect(page.getByRole("heading", { name: "الرئيسية" })).toBeVisible()
})
