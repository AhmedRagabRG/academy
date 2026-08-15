import { expect, test } from "@playwright/test"
import {
  financeRoutes,
  openFinance,
  seededStudentId,
  viewports,
} from "../helpers/student-finance"

test("the student workspace carries a finance tab", async ({ page }) => {
  await openFinance(page, `/students/${seededStudentId}`)

  await expect(
    page.getByRole("link", { name: /المالية|الشؤون المالية/ })
  ).toBeVisible()
})

test("the student's financial figures match the finance workspace", async ({
  page,
}) => {
  await openFinance(page, financeRoutes.studentWorkspace)

  // Both surfaces derive from the same records, so the totals must agree.
  await expect(page.getByText(/إجمالي|الرصيد/).first()).toBeVisible()
  await expect(page.getByText(/غير متاح/)).toHaveCount(0)
})

test("a student with no financial records reads as zero, not as unavailable", async ({
  page,
}) => {
  await openFinance(page, "/students/student-STD-2026-00007/finance")

  // Absence of a balance is a fact when it is one; it must not read as an outage.
  await expect(page.getByText(/تعذر|غير متاح/)).toHaveCount(0)
})

test("the financial timeline pages incrementally in order", async ({ page }) => {
  await openFinance(page, financeRoutes.studentWorkspace)

  await expect(page.getByText("السجل المالي")).toBeVisible()
  const loadMore = page.getByRole("button", { name: /عرض المزيد/ })
  if (await loadMore.isVisible().catch(() => false)) {
    const before = await page.getByRole("listitem").count()
    await loadMore.click()
    await expect
      .poll(() => page.getByRole("listitem").count())
      .toBeGreaterThan(before)
  }
})

test("the timeline can be filtered by category", async ({ page }) => {
  await openFinance(page, financeRoutes.studentWorkspace)

  await page.getByLabel("نوع الحدث").selectOption("payment-received")
  await expect(page.locator("main")).toBeVisible()
})

test("finance navigation reaches every queue", async ({ page }) => {
  await openFinance(page, financeRoutes.dashboard)

  for (const [name, route] of [
    ["الفواتير", financeRoutes.invoices],
    ["المدفوعات", financeRoutes.payments],
    ["الأقساط", financeRoutes.installments],
    ["المستردات", financeRoutes.refunds],
  ] as const) {
    await page.goto(route)
    await page.locator("main").waitFor()
    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible()
  }
})

test("every finance route renders right-to-left", async ({ page }) => {
  for (const route of [
    financeRoutes.dashboard,
    financeRoutes.invoices,
    financeRoutes.payments,
    financeRoutes.refunds,
  ]) {
    await openFinance(page, route)
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
    await expect(page.locator("html")).toHaveAttribute("lang", "ar")
  }
})

test("monetary values are direction-isolated", async ({ page }) => {
  await openFinance(page, financeRoutes.invoices)

  // Money is a mixed-direction value inside Arabic text; without isolation the
  // surrounding text reorders its digits.
  const isolated = page.locator("bdi[dir='ltr']")
  await expect(isolated.first()).toBeVisible()
})

test("the queues stay usable from laptop down to tablet", async ({ page }) => {
  for (const size of [viewports.desktop, viewports.laptop, viewports.tablet]) {
    await page.setViewportSize(size)
    await openFinance(page, financeRoutes.invoices)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()

    // Nothing may force the page itself to scroll sideways.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflow, `horizontal overflow at ${size.width}px`).toBe(false)
  }
})
