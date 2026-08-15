import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { openAdmissions } from "../helpers/admissions"

test("admissions primary routes have no serious accessibility violations", async ({ page }) => {
  await openAdmissions(page)
  for (const route of [
    "/admissions",
    "/admissions/create",
    "/admissions/admission-mariam-1",
    "/admissions/admission-mariam-1/edit",
  ]) {
    await page.goto(route)
    await page.locator("main").waitFor()
    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations.filter((item) =>
        ["critical", "serious"].includes(item.impact ?? "")
      )
    ).toEqual([])
  }
})
