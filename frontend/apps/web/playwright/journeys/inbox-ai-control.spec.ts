import { expect, test } from "@playwright/test"
import { openInbox } from "../helpers/inbox"

test("AI assistant state and controls are visible on a conversation", async ({
  page,
}) => {
  await openInbox(page)
  await page
    .getByRole("list", { name: "المحادثات" })
    .getByRole("button")
    .first()
    .click()
  const panel = page.getByRole("region", { name: "مساعد الذكاء الاصطناعي" })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole("button", { name: "إيقاف المساعد" })).toBeVisible()
  await expect(panel.getByRole("button", { name: "تشغيل المساعد" })).toBeVisible()
})
