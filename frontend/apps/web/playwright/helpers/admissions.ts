import type { Page } from "@playwright/test"
import { signIn } from "./auth"

export async function openAdmissions(page: Page, route = "/admissions") {
  await signIn(page)
  await page.goto(route)
  await page.locator("main").waitFor()
}
