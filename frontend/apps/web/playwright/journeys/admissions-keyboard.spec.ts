import { expect, test } from "@playwright/test"
import { openAdmissions } from "../helpers/admissions"

test("admission registration remains keyboard operable", async ({ page }) => {
  await openAdmissions(page, "/admissions/create")
  await page.getByLabel("الاسم الكامل").focus()
  await page.keyboard.type("متقدم للاختبار")
  await page.keyboard.press("Tab")
  await expect(page.getByLabel("رقم الهاتف")).toBeFocused()
  await page.keyboard.type("01012345678")
  await expect(page.getByRole("button", { name: /حفظ/ })).toBeVisible()
})
