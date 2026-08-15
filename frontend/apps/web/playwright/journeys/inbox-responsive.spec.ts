import { expect, test } from "@playwright/test"
import { openInbox } from "../helpers/inbox"
test("Inbox has no horizontal page overflow", async ({ page }) => { await page.setViewportSize({ width: 768, height: 1024 }); await openInbox(page); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true); await page.getByRole("list", { name: "المحادثات" }).getByRole("button").first().click(); await expect(page.getByRole("button", { name: /المحادثات/ })).toBeVisible() })
