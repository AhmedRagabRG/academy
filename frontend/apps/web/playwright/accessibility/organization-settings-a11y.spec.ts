import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
test("settings overview and permissions have no serious accessibility violations", async ({ page }) => { await signIn(page); for (const route of ["/settings", "/settings/organization", "/settings/permissions"]) { await page.goto(route); await page.locator("main").waitFor(); const results = await new AxeBuilder({ page }).analyze(); expect(results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]) } })
