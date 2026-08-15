import { expect, test } from "@playwright/test"
import { openInbox } from "../helpers/inbox"
test("internal notes are explicitly private", async ({ page }) => { await openInbox(page); await page.getByRole("list", { name: "المحادثات" }).getByRole("button").first().click(); await expect(page.getByText(/ملاحظة داخلية/).first()).toBeVisible() })
