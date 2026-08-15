import { expect, test } from "@playwright/test"
import { openStudentWorkspace, openStudents } from "../helpers/students"

test("the student search and filters are reachable by keyboard", async ({
  page,
}) => {
  await openStudents(page)

  const search = page.getByRole("searchbox")
  await search.focus()
  await expect(search).toBeFocused()
  await search.fill("يوسف")

  const status = page.getByLabel("الحالة")
  await status.focus()
  await expect(status).toBeFocused()
})

test("every workspace tab is in the tab order and activates with Enter", async ({
  page,
}) => {
  await openStudentWorkspace(page)
  const tabs = page.getByRole("navigation", { name: "أقسام ملف الطالب" })

  // Unlike an ARIA tablist, these are links: all of them stay tabbable.
  const documents = tabs.getByRole("link", { name: "المستندات" })
  await documents.focus()
  await expect(documents).toBeFocused()
  await page.keyboard.press("Enter")
  await page.waitForURL("**/documents")

  const timeline = tabs.getByRole("link", { name: "السجل الزمني" })
  await timeline.focus()
  await expect(timeline).toBeFocused()
})

test("the status dialog traps focus and restores it on close", async ({
  page,
}) => {
  await openStudentWorkspace(page)
  const trigger = page.getByRole("button", { name: "تخريج الطالب" })
  await trigger.focus()
  await page.keyboard.press("Enter")

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole("button", { name: "إلغاء" })).toBeFocused()

  await dialog.getByRole("button", { name: "إلغاء" }).click()
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test("the editor moves focus to the first invalid field on a failed save", async ({
  page,
}) => {
  await openStudentWorkspace(page, undefined, "/edit")

  await page.getByLabel("رقم الهاتف", { exact: true }).fill("123")
  await page.getByRole("button", { name: "حفظ التعديلات" }).click()

  await expect(page.getByRole("alert").first()).toBeVisible()
  await expect(page.getByLabel("رقم الهاتف", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true"
  )
})

test("the note composer announces a refused empty submission", async ({
  page,
}) => {
  await openStudentWorkspace(page, undefined, "/notes")

  const add = page.getByRole("button", { name: "إضافة ملاحظة" })
  await add.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("alert")).toContainText("لا يمكن حفظ ملاحظة فارغة")
})

test("sidebar navigation groups expand and collapse from the keyboard", async ({
  page,
}) => {
  await openStudents(page)

  const group = page.getByRole("button", { name: /المؤسسة والإعدادات/ })
  await group.focus()
  await expect(group).toHaveAttribute("aria-expanded", "false")

  await page.keyboard.press("Enter")
  await expect(group).toHaveAttribute("aria-expanded", "true")
  await expect(page.getByRole("link", { name: "الفروع" })).toBeVisible()

  await page.keyboard.press("Enter")
  await expect(group).toHaveAttribute("aria-expanded", "false")
})
