import { expect, test } from "@playwright/test"
import { openInbox } from "../helpers/inbox"
test("AI capabilities remain disabled placeholders", async ({ page }) => { await openInbox(page); await page.getByRole("list", { name: "المحادثات" }).getByRole("button").first().click(); await expect(page.getByText("قريبًا")).toHaveCount(6) })
