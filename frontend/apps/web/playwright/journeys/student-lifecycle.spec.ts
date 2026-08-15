import { expect, test } from "@playwright/test"
import { archivedStudentId, openStudentWorkspace } from "../helpers/students"

test("an active student offers exactly the permitted transitions", async ({
  page,
}) => {
  await openStudentWorkspace(page)

  for (const label of [
    "إيقاف الطالب",
    "تخريج الطالب",
    "تسجيل انسحاب الطالب",
    "أرشفة الطالب",
  ])
    await expect(page.getByRole("button", { name: label })).toBeVisible()

  // Activation is not a transition available from `active`.
  await expect(page.getByRole("button", { name: "تفعيل الطالب" })).toHaveCount(0)
})

test("a transition requiring a reason blocks confirmation until one is given", async ({
  page,
}) => {
  await openStudentWorkspace(page)
  await page.getByRole("button", { name: "إيقاف الطالب" }).click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/السبب \(مطلوب\)/)).toBeVisible()
  await expect(dialog.getByRole("button", { name: "تأكيد" })).toBeDisabled()

  await dialog.getByRole("textbox").fill("طلب الطالب إيقافًا مؤقتًا")
  await expect(dialog.getByRole("button", { name: "تأكيد" })).toBeEnabled()
})

test("suspending a student applies and is reflected in the workspace", async ({
  page,
}) => {
  await openStudentWorkspace(page)
  await page.getByRole("button", { name: "إيقاف الطالب" }).click()

  const dialog = page.getByRole("dialog")
  await dialog.getByRole("textbox").fill("طلب الطالب إيقافًا مؤقتًا")
  await dialog.getByRole("button", { name: "تأكيد" }).click()

  await expect(page.getByText("موقوف").first()).toBeVisible()
})

test("an archived student is read-only and offers activation", async ({
  page,
}) => {
  await openStudentWorkspace(page, archivedStudentId)

  await expect(page.getByText(/هذا الطالب مؤرشف/)).toBeVisible()
  await expect(page.getByRole("button", { name: "تفعيل الطالب" })).toBeVisible()
  await expect(page.getByRole("link", { name: /تعديل بيانات الطالب/ })).toHaveCount(
    0
  )
})

test("opening the editor for an archived student shows locked guidance", async ({
  page,
}) => {
  await openStudentWorkspace(page, archivedStudentId, "/edit")

  await expect(page.getByText(/هذا الطالب مؤرشف/).first()).toBeVisible()
  await expect(page.getByRole("button", { name: "حفظ التعديلات" })).toHaveCount(
    0
  )
})

test("the profile editor validates before saving and keeps protected fields locked", async ({
  page,
}) => {
  await openStudentWorkspace(page, undefined, "/edit")

  await page.getByLabel("رقم الهاتف", { exact: true }).fill("123")
  await page.getByRole("button", { name: "حفظ التعديلات" }).click()

  await expect(page.getByRole("alert").first()).toContainText("تعذر الحفظ")
  await expect(page.getByText("صيغة رقم الهاتف غير صحيحة")).toBeVisible()
  // The student code is shown but never editable.
  await expect(page.getByLabel("كود الطالب")).toHaveCount(0)
})
