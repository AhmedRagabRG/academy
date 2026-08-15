import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { openInbox } from "../helpers/inbox"
test("Inbox has no serious accessibility violations", async ({ page }) => { await openInbox(page); const results = await new AxeBuilder({ page }).analyze(); expect(results.violations.filter((item) => ["critical", "serious"].includes(item.impact ?? ""))).toEqual([]) })
