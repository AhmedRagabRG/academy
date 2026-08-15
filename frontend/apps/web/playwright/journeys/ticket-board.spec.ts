import { expect, test } from "@playwright/test"
test("ticket board exposes the complete keyboard-operable workflow", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel(/البريد/).fill("employee@alsalam.edu")
  await page.getByRole("textbox", { name: "كلمة المرور" }).fill("demo1234")
  await page.getByRole("button", { name: "تسجيل الدخول" }).click()
  await expect(page).toHaveURL(/dashboard/)
  await page.goto("/tickets")
  await expect(page.getByRole("heading", { name: "إدارة التذاكر" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "قائمة الانتظار" })).toBeVisible()
  const move = page.getByLabel("نقل التذكرة إلى حالة").first()
  await move.selectOption("review")
  await expect(page.getByText("تم تحديث الحالة")).toBeVisible()
})
