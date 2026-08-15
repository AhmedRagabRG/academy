import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
import { seededStudentId } from "../helpers/students"

const routes = [
  "/students",
  `/students/${seededStudentId}`,
  `/students/${seededStudentId}/edit`,
  `/students/${seededStudentId}/documents`,
  `/students/${seededStudentId}/notes`,
  `/students/${seededStudentId}/timeline`,
]

const serious = (impact?: string | null) =>
  ["critical", "serious"].includes(impact ?? "")

test("every student route is free of serious accessibility violations", async ({
  page,
}) => {
  await signIn(page)
  for (const route of routes) {
    await page.goto(route)
    await page.locator("main").waitFor()
    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations.filter((violation) => serious(violation.impact)),
      `violations on ${route}`
    ).toEqual([])
  }
})

test("student routes stay accessible in dark theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" })
  await signIn(page)
  for (const route of [routes[0]!, routes[1]!]) {
    await page.goto(route)
    await page.locator("main").waitFor()
    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations.filter((violation) => serious(violation.impact)),
      `dark-theme violations on ${route}`
    ).toEqual([])
  }
})

test("the status dialog is accessible while open", async ({ page }) => {
  await signIn(page)
  await page.goto(`/students/${seededStudentId}`)
  await page.locator("main").waitFor()
  await page.getByRole("button", { name: "إيقاف الطالب" }).click()
  await expect(page.getByRole("dialog")).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  expect(
    results.violations.filter((violation) => serious(violation.impact))
  ).toEqual([])
})

test("the interface renders right-to-left", async ({ page }) => {
  await signIn(page)
  await page.goto("/students")
  await page.locator("main").waitFor()
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  await expect(page.locator("html")).toHaveAttribute("lang", "ar")
})
