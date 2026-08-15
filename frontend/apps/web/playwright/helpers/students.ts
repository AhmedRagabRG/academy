import type { Page } from "@playwright/test"
import { signIn } from "./auth"

/** The seeded student used across the student journeys. */
export const seededStudentCode = "STD-2026-00001"
export const seededStudentId = "student-STD-2026-00001"
export const archivedStudentId = "student-STD-2026-00006"
/** A seeded student deliberately created with no enrollments. */
export const studentWithoutEnrollmentsId = "student-STD-2026-00007"

export async function openStudents(page: Page, route = "/students") {
  await signIn(page)
  await page.goto(route)
  await page.locator("main").waitFor()
}

export async function openStudentWorkspace(
  page: Page,
  studentId = seededStudentId,
  area = ""
) {
  await signIn(page)
  await page.goto(`/students/${studentId}${area}`)
  await page.locator("main").waitFor()
}

export const viewports = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 800 },
  tablet: { width: 834, height: 1112 },
} as const
