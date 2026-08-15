import { expect, test } from "@playwright/test"

test("mock login enters the workspace", async ({ page }) => {
  await page.goto("/login", { waitUntil: "networkidle" })
  const email = page.getByLabel("البريد الإلكتروني")
  const password = page.locator("#password")
  await email.fill("employee@alsalam.edu")
  await password.fill("demo1234")
  await expect(email).toHaveValue("employee@alsalam.edu")
  await expect(password).toHaveValue("demo1234")
  await page.getByRole("button", { name: "تسجيل الدخول" }).click()
  await expect(page).toHaveURL(/dashboard/)
  await expect(page.getByRole("heading", { name: "الرئيسية" })).toBeVisible()
})
