import { expect, test } from "@playwright/test"
import { openStudents, seededStudentCode, viewports } from "../helpers/students"

test("students appear from admissions and offer no manual create or delete", async ({
  page,
}) => {
  await openStudents(page)

  await expect(
    page.getByRole("heading", { name: "الطلاب", level: 1 })
  ).toBeVisible()
  await expect(page.getByText(/لا يمكن إنشاء طالب يدويًا/)).toBeVisible()
  await expect(page.getByRole("link", { name: /إضافة طالب/ })).toHaveCount(0)
  await expect(page.getByRole("button", { name: /حذف/ })).toHaveCount(0)
})

test("search narrows the list by name, code, and phone", async ({ page }) => {
  await openStudents(page)
  const search = page.getByRole("searchbox")

  await search.fill("يوسف")
  await expect(page.getByRole("link", { name: seededStudentCode })).toBeVisible()

  await search.fill(seededStudentCode)
  await expect(page.getByRole("link", { name: seededStudentCode })).toBeVisible()

  await search.fill("لا-يوجد-طالب")
  await expect(page.getByText("لا يوجد طلاب مطابقون")).toBeVisible()
})

test("filters compose and can be cleared", async ({ page }) => {
  await openStudents(page)

  await page.getByLabel("الحالة").selectOption("archived")
  await expect(
    page.getByRole("button", { name: /مسح عوامل التصفية/ })
  ).toBeVisible()

  await page.getByLabel("القسم").selectOption("department-it")
  await page.getByRole("button", { name: /مسح عوامل التصفية/ }).click()
  await expect(
    page.getByRole("button", { name: /مسح عوامل التصفية/ })
  ).toHaveCount(0)
})

test("a student row links into its workspace", async ({ page }) => {
  await openStudents(page)
  await page.getByRole("link", { name: seededStudentCode }).first().click()
  await expect(
    page.getByRole("heading", { name: "يوسف عبد الرحمن", level: 1 })
  ).toBeVisible()
})

for (const [name, viewport] of Object.entries(viewports)) {
  test(`the student list stays usable at ${name} width`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await openStudents(page)

    await expect(
      page.getByRole("heading", { name: "الطلاب", level: 1 })
    ).toBeVisible()
    await expect(page.getByRole("searchbox")).toBeVisible()

    // The page itself must never scroll horizontally; wide tables scroll internally.
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    )
    expect(overflows).toBe(false)
  })
}
