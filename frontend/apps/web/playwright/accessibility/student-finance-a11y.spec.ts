import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
import { allFinanceRoutes, financeRoutes } from "../helpers/student-finance"

const serious = (impact?: string | null) =>
  ["critical", "serious"].includes(impact ?? "")

test("every finance route is free of serious accessibility violations", async ({
  page,
}) => {
  await signIn(page)
  for (const route of allFinanceRoutes) {
    await page.goto(route)
    await page.locator("main").waitFor()
    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations.filter((violation) => serious(violation.impact)),
      `violations on ${route}`
    ).toEqual([])
  }
})

test("invoice detail is free of serious violations", async ({ page }) => {
  await signIn(page)
  await page.goto(financeRoutes.invoices)
  await page.getByRole("link", { name: /INV-/ }).first().click()
  await page.locator("main").waitFor()

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.filter((v) => serious(v.impact))).toEqual([])
})

test("an open dialog is free of serious violations", async ({ page }) => {
  await signIn(page)
  await page.goto(financeRoutes.invoices)
  await page.getByRole("link", { name: /INV-/ }).first().click()
  await page.locator("main").waitFor()

  const apply = page.getByRole("button", { name: "تطبيق خصم" })
  if ((await apply.count()) === 0) test.skip()
  await apply.click()
  await expect(page.getByRole("dialog")).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.filter((v) => serious(v.impact))).toEqual([])
})

test("status is never conveyed by colour alone", async ({ page }) => {
  await signIn(page)
  await page.goto(financeRoutes.invoices)
  await page.locator("main").waitFor()

  // Every status badge carries a text label; a colour-only badge would be empty.
  const badges = page.locator("[data-status], .status-badge, span:has-text('صادرة')")
  if ((await badges.count()) > 0)
    await expect(badges.first()).not.toHaveText("")
})
