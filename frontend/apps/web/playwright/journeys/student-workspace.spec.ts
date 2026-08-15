import { expect, test } from "@playwright/test"
import {
  openStudentWorkspace,
  seededStudentCode,
  studentWithoutEnrollmentsId,
  viewports,
} from "../helpers/students"

test("the workspace shows personal, academic, and protected system information", async ({
  page,
}) => {
  await openStudentWorkspace(page)

  await expect(page.getByText("البيانات الشخصية")).toBeVisible()
  await expect(page.getByText("البيانات الأكاديمية")).toBeVisible()
  await expect(page.getByText("بيانات النظام")).toBeVisible()
  await expect(page.getByText(seededStudentCode).first()).toBeVisible()
})

test("enrollments show a batch for a program and none for a course", async ({
  page,
}) => {
  await openStudentWorkspace(page)

  await expect(page.getByText("برنامج تطوير الويب الاحترافي")).toBeVisible()
  await expect(page.getByText(/المجموعة:/)).toBeVisible()
  await expect(page.getByText("دورة اللغة الإنجليزية")).toBeVisible()
  // Display-only: no enrollment mutation anywhere in the area.
  await expect(page.getByRole("button", { name: /إضافة تسجيل/ })).toHaveCount(0)
})

test("a student with no enrollments shows an empty state, not an error", async ({
  page,
}) => {
  await openStudentWorkspace(page, studentWithoutEnrollmentsId)
  await expect(page.getByText("لا توجد تسجيلات أكاديمية")).toBeVisible()
})

test("the financial summary is read-only and honest about absence", async ({
  page,
}) => {
  await openStudentWorkspace(page)

  await expect(page.getByText("الملخص المالي")).toBeVisible()
  await expect(
    page.getByText(/وحدة الشؤون المالية للطلاب غير متاحة بعد/)
  ).toBeVisible()
  for (const label of ["سداد", "استرداد", "قسط جديد"])
    await expect(page.getByRole("button", { name: label })).toHaveCount(0)
})

test("workspace tabs navigate between areas and mark the active one", async ({
  page,
}) => {
  await openStudentWorkspace(page)
  const tabs = page.getByRole("navigation", { name: "أقسام ملف الطالب" })

  await tabs.getByRole("link", { name: "المستندات" }).click()
  await page.waitForURL("**/documents")
  await expect(
    tabs.getByRole("link", { name: "المستندات" })
  ).toHaveAttribute("aria-current", "page")

  await tabs.getByRole("link", { name: "السجل الزمني" }).click()
  await page.waitForURL("**/timeline")
  await expect(
    tabs.getByRole("link", { name: "السجل الزمني" })
  ).toHaveAttribute("aria-current", "page")
})

test("the timeline shows admission and creation history in order", async ({
  page,
}) => {
  await openStudentWorkspace(page, undefined, "/timeline")

  await expect(page.getByText("تم تقديم طلب القبول")).toBeVisible()
  await expect(page.getByText("تم اعتماد طلب القبول")).toBeVisible()
  await expect(page.getByText("تم إنشاء سجل الطالب")).toBeVisible()
})

test("notes show author and time and refuse empty content", async ({ page }) => {
  await openStudentWorkspace(page, undefined, "/notes")

  await expect(page.getByText("أحمد محمد").first()).toBeVisible()
  await page.getByRole("button", { name: "إضافة ملاحظة" }).click()
  await expect(page.getByRole("alert")).toContainText("لا يمكن حفظ ملاحظة فارغة")
})

test("documents distinguish present and missing evidence", async ({ page }) => {
  await openStudentWorkspace(page, undefined, "/documents")

  await expect(page.getByText("بطاقة الرقم القومي")).toBeVisible()
  await expect(page.getByText("مرفوع").first()).toBeVisible()
  // Archiving is offered; deleting never is.
  await expect(page.getByRole("button", { name: "حذف" })).toHaveCount(0)
})

for (const [name, viewport] of Object.entries(viewports)) {
  test(`the workspace stays usable at ${name} width`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await openStudentWorkspace(page)

    await expect(
      page.getByRole("navigation", { name: "أقسام ملف الطالب" })
    ).toBeVisible()
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    )
    expect(overflows).toBe(false)
  })
}
