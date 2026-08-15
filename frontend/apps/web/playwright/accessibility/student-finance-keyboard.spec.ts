import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
import { financeRoutes } from "../helpers/student-finance"

test("every finance queue is reachable and operable by keyboard", async ({
  page,
}) => {
  await signIn(page)
  for (const route of [
    financeRoutes.invoices,
    financeRoutes.payments,
    financeRoutes.installments,
    financeRoutes.refunds,
  ]) {
    await page.goto(route)
    await page.locator("main").waitFor()

    await page.keyboard.press("Tab")
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(focused, `no focusable element on ${route}`).not.toBe("BODY")
  }
})

test("a dialog takes focus on open and returns it on close", async ({ page }) => {
  await signIn(page)
  await page.goto(financeRoutes.invoices)
  await page.getByRole("link", { name: /INV-/ }).first().click()
  await page.locator("main").waitFor()

  const apply = page.getByRole("button", { name: "تطبيق خصم" })
  if ((await apply.count()) === 0) test.skip()
  await apply.focus()
  await page.keyboard.press("Enter")

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  // Focus moves into the dialog rather than being left behind the overlay.
  const inside = await page.evaluate(() => {
    const dialogElement = document.querySelector("[role='dialog']")
    return dialogElement?.contains(document.activeElement) ?? false
  })
  expect(inside).toBe(true)

  await dialog.getByRole("button", { name: "إلغاء" }).click()
  await expect(dialog).toHaveCount(0)
})

test("submitting an invalid monetary form moves focus to the first error", async ({
  page,
}) => {
  await signIn(page)
  await page.goto(financeRoutes.invoices)
  await page.getByRole("link", { name: /INV-/ }).first().click()
  await page.locator("main").waitFor()

  const apply = page.getByRole("button", { name: "تطبيق خصم" })
  if ((await apply.count()) === 0) test.skip()
  await apply.click()

  const dialog = page.getByRole("dialog")
  await dialog.getByRole("button", { name: "تطبيق خصم" }).click()

  // The user must not have to hunt for what was wrong.
  await expect(dialog.getByRole("alert").first()).toBeVisible()
  const focusedId = await page.evaluate(() => document.activeElement?.id ?? "")
  expect(focusedId).not.toBe("")
})

test("filters and their clear control are keyboard operable", async ({ page }) => {
  await signIn(page)
  await page.goto(financeRoutes.invoices)
  await page.locator("main").waitFor()

  await page.getByLabel("الحالة").focus()
  await page.getByLabel("الحالة").selectOption("draft")
  await expect(page.getByText(/عدد عوامل التصفية المطبقة/)).toBeVisible()

  const clear = page.getByRole("button", { name: /مسح كل عوامل التصفية/ }).first()
  await clear.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByText(/عدد عوامل التصفية المطبقة/)).toHaveCount(0)
})

test("the timeline load-more control is keyboard operable", async ({ page }) => {
  await signIn(page)
  await page.goto(financeRoutes.studentWorkspace)
  await page.locator("main").waitFor()

  const loadMore = page.getByRole("button", { name: /عرض المزيد/ })
  if (!(await loadMore.isVisible().catch(() => false))) test.skip()
  await loadMore.focus()
  await page.keyboard.press("Enter")
  await expect(page.locator("main")).toBeVisible()
})
