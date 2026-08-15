import { expect, test } from "@playwright/test"
import { openInbox } from "../helpers/inbox"
test("employees browse, filter, and open a conversation", async ({ page }) => { await openInbox(page); await expect(page.getByRole("navigation", { name: "طرق عرض صندوق الوارد" })).toBeVisible(); const cards = page.getByRole("list", { name: "المحادثات" }).getByRole("button"); await expect(cards.first()).toBeVisible(); await cards.first().click(); await expect(page.getByRole("log", { name: "سجل الرسائل" })).toBeVisible() })
