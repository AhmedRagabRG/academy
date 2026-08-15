import { expect, test } from "@playwright/test"
import { openInbox } from "../helpers/inbox"
test("a permitted employee sends a mock reply", async ({ page }) => {
  await openInbox(page)
  await page
    .getByRole("list", { name: "المحادثات" })
    .getByRole("button")
    .first()
    .click()
  const composer = page.getByLabel("نص الرسالة")
  await composer.fill("رسالة من اختبار المتصفح")
  await page.getByRole("button", { name: "إرسال الرسالة" }).click()
  await expect(
    page
      .getByRole("log", { name: "سجل الرسائل" })
      .getByText("رسالة من اختبار المتصفح")
  ).toBeVisible()
})
