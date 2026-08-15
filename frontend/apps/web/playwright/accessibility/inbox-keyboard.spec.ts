import { expect, test } from "@playwright/test"
import { openInbox } from "../helpers/inbox"
test("conversation list and composer are keyboard reachable", async ({ page }) => { await openInbox(page); const first = page.getByRole("list", { name: "المحادثات" }).getByRole("button").first(); await first.focus(); await page.keyboard.press("Enter"); await expect(page.getByLabel("نص الرسالة")).toBeVisible(); await expect(page.getByLabel("نص الرسالة")).toBeEditable() })
