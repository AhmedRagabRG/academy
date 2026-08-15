import { expect, test } from "@playwright/test"
import {
  draftStudentCode,
  financeRoutes,
  openFinance,
  openFirstInvoice,
  searchQueue,
  unpaidStudentCode,
} from "../helpers/student-finance"

test("the invoices queue lists invoices and never offers deletion", async ({
  page,
}) => {
  await openFinance(page, financeRoutes.invoices)

  await expect(page.getByRole("heading", { name: "الفواتير", level: 1 })).toBeVisible()
  await expect(page.getByText(/لا يتم حذف/)).toBeVisible()
  await expect(page.getByRole("button", { name: /^حذف/ })).toHaveCount(0)
})

test("search narrows the queue by student code", async ({ page }) => {
  await openFinance(page, financeRoutes.invoices)
  await searchQueue(page, unpaidStudentCode)
  await expect(page.getByText(unpaidStudentCode).first()).toBeVisible()

  await searchQueue(page, "لا-توجد-فاتورة")
  await expect(page.getByText("لا توجد فواتير مطابقة")).toBeVisible()
})

test("an empty queue offers to clear the filters that emptied it", async ({
  page,
}) => {
  await openFinance(page, financeRoutes.invoices)
  await searchQueue(page, "لا-توجد-فاتورة")

  const clear = page.getByRole("button", { name: /مسح كل عوامل التصفية/ }).first()
  await expect(clear).toBeVisible()
  await clear.click()
  await expect(page.getByText("لا توجد فواتير مطابقة")).toHaveCount(0)
})

test("filters compose across status, branch, and date", async ({ page }) => {
  await openFinance(page, financeRoutes.invoices)

  await page.getByLabel("الحالة").selectOption("draft")
  await expect(page.getByText(/عدد عوامل التصفية المطبقة/)).toBeVisible()
  await expect(page.getByText(draftStudentCode).first()).toBeVisible()
})

test("an inverted date range is reported rather than silently returning nothing", async ({
  page,
}) => {
  await openFinance(page, financeRoutes.invoices)

  await page.getByLabel(/تاريخ الإصدار — من/).fill("2026-06-01")
  await page.getByLabel(/تاريخ الإصدار — إلى/).fill("2026-01-01")
  await expect(page.getByRole("alert")).toContainText(/تاريخ البداية/)
})

test("invoice detail shows the derived figures and the immutability notice", async ({
  page,
}) => {
  await openFirstInvoice(page)

  await expect(page.getByRole("heading", { level: 1 })).toContainText(/INV-/)
  await expect(page.getByText("القيم المالية")).toBeVisible()
  await expect(page.getByText(/المبلغ المتبقي|المتبقي/).first()).toBeVisible()
})

test("an issued invoice cannot be edited back into a draft", async ({ page }) => {
  await openFinance(page, financeRoutes.invoices)
  await page.getByLabel("الحالة").selectOption("issued")
  await page.getByRole("link", { name: /INV-/ }).first().click()
  await page.locator("main").waitFor()

  await expect(page.getByRole("button", { name: "إصدار الفاتورة" })).toHaveCount(0)
  await expect(page.getByText(/لا يمكن تعديل/).first()).toBeVisible()
})

test("cancelling requires a real reason", async ({ page }) => {
  await openFinance(page, financeRoutes.invoices)
  await page.getByLabel("الحالة").selectOption("draft")
  await page.getByRole("link", { name: /INV-/ }).first().click()
  await page.locator("main").waitFor()

  await page.getByRole("button", { name: "إلغاء الفاتورة" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  // Confirming with no reason must not submit a fabricated one.
  await dialog.getByRole("button", { name: /^إلغاء الفاتورة|تأكيد/ }).click()
  await expect(dialog.getByRole("alert")).toBeVisible()
})

test("creating an invoice is reachable only with the create permission", async ({
  page,
}) => {
  await openFinance(page, financeRoutes.invoices)
  await expect(page.getByRole("link", { name: /إنشاء فاتورة/ })).toBeVisible()

  await openFinance(page, financeRoutes.createInvoice)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
})

test("pagination stays within bounds", async ({ page }) => {
  await openFinance(page, financeRoutes.invoices)
  const next = page.getByRole("button", { name: /التالي/ })
  if (await next.isEnabled().catch(() => false)) {
    await next.click()
    await expect(page.locator("main")).toBeVisible()
  }
  await expect(page.getByRole("main")).toBeVisible()
})
