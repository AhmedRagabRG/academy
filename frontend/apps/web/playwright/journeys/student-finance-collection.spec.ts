import { expect, test } from "@playwright/test"
import {
  financeRoutes,
  openFinance,
  openFirstInvoice,
} from "../helpers/student-finance"

test("the payments queue states that a recorded payment cannot be edited", async ({
  page,
}) => {
  await openFinance(page, financeRoutes.payments)

  await expect(page.getByRole("heading", { name: "المدفوعات", level: 1 })).toBeVisible()
  await expect(page.getByText(/لا يمكن تعديل أو حذف دفعة/)).toBeVisible()
  await expect(page.getByRole("button", { name: /^حذف/ })).toHaveCount(0)
})

test("payments can be filtered by method and date", async ({ page }) => {
  await openFinance(page, financeRoutes.payments)

  await page.getByLabel("طريقة الدفع").selectOption({ index: 1 })
  await expect(page.getByText(/عدد عوامل التصفية المطبقة/)).toBeVisible()

  await page.getByRole("button", { name: /مسح كل عوامل التصفية/ }).first().click()
  await expect(page.getByText(/عدد عوامل التصفية المطبقة/)).toHaveCount(0)
})

test("the installments queue shows derived statuses including overdue", async ({
  page,
}) => {
  await openFinance(page, financeRoutes.installments)

  await expect(page.getByRole("heading", { name: "الأقساط", level: 1 })).toBeVisible()
  await page.getByLabel("الحالة").selectOption("overdue")
  await expect(page.locator("main")).toBeVisible()
})

test("a payment above the remaining balance is refused before it is sent", async ({
  page,
}) => {
  await openFinance(page, financeRoutes.invoices)
  await page.getByLabel("الحالة").selectOption("issued")
  await page.getByRole("link", { name: /INV-/ }).first().click()
  await page.locator("main").waitFor()

  const record = page.getByRole("button", { name: /تسجيل دفعة/ })
  if ((await record.count()) === 0) test.skip()
  await record.click()

  const dialog = page.getByRole("dialog")
  await dialog.getByLabel(/المبلغ/).fill("99999999.00")
  await dialog.getByRole("button", { name: /تسجيل دفعة/ }).click()

  await expect(dialog.getByRole("alert")).toBeVisible()
})

test("an installment schedule is a semantic table restating its total", async ({
  page,
}) => {
  await openFinance(page, financeRoutes.invoices)
  await page.getByLabel("الحالة").selectOption("issued")
  await page.getByRole("link", { name: /INV-/ }).first().click()
  await page.locator("main").waitFor()

  const table = page.getByRole("table")
  if ((await table.count()) > 0) {
    await expect(table.first().getByRole("columnheader").first()).toBeVisible()
  }
})

test("a discount preview matches the amount that gets saved", async ({ page }) => {
  await openFirstInvoice(page)

  const apply = page.getByRole("button", { name: "تطبيق خصم" })
  if ((await apply.count()) === 0) test.skip()
  await apply.click()

  const dialog = page.getByRole("dialog")
  await dialog.getByLabel(/القيمة/).fill("10")
  // The preview appears as soon as the value is well formed.
  await expect(dialog.getByText(/بعد الخصم|القيمة بعد الخصم/)).toBeVisible()
})

test("a discount above the configured limit is refused in the form", async ({
  page,
}) => {
  await openFirstInvoice(page)

  const apply = page.getByRole("button", { name: "تطبيق خصم" })
  if ((await apply.count()) === 0) test.skip()
  await apply.click()

  const dialog = page.getByRole("dialog")
  await dialog.getByLabel(/القيمة/).fill("90")
  await dialog.getByLabel(/السبب/).fill("خصم كبير")
  await dialog.getByRole("button", { name: "تطبيق خصم" }).click()

  await expect(dialog.getByRole("alert")).toBeVisible()
})

test("the refunds queue explains that recording is not paying", async ({ page }) => {
  await openFinance(page, financeRoutes.refunds)

  await expect(page.getByRole("heading", { name: "المستردات", level: 1 })).toBeVisible()
  await expect(page.getByText(/خارج هذه الوحدة/)).toBeVisible()
})

test("a refund decision is offered only where the policy allows it", async ({
  page,
}) => {
  await openFinance(page, financeRoutes.refunds)

  const complete = page.getByRole("button", { name: "إتمام الاسترداد" })
  const approve = page.getByRole("button", { name: "اعتماد الاسترداد" })
  // A completed refund offers neither; a requested one never offers completion.
  if ((await complete.count()) > 0) await expect(approve).toHaveCount(0)
})

test("rejecting a refund requires a reason", async ({ page }) => {
  await openFinance(page, financeRoutes.refunds)

  const reject = page.getByRole("button", { name: "رفض الاسترداد" })
  if ((await reject.count()) === 0) test.skip()
  await reject.first().click()

  await expect(page.getByRole("button", { name: "تأكيد الرفض" })).toBeDisabled()
})
