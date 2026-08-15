import { expect, test } from "@playwright/test"
import { openInbox } from "../helpers/inbox"

test("Inbox exposes only registered permission-aware actions", async ({
  page,
}) => {
  await openInbox(page)
  await page
    .getByRole("list", { name: "المحادثات" })
    .getByRole("button")
    .first()
    .click()
  await expect(page.getByRole("button", { name: "الإسناد" })).toBeVisible()
  await expect(
    page.getByRole("button", { name: "إرسال الرسالة" })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "أرشفة المحادثة" })
  ).toBeVisible()
})
