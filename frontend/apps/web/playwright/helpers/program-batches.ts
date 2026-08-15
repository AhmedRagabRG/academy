import type { Page } from "@playwright/test"
import { signIn } from "./auth"
export const programId = "product-professional"
export async function openProgramBatches(page: Page, path = "") {
  await signIn(page)
  await page.goto(`/academic-catalog/programs/${programId}/batches${path}`)
  await page.locator("main").waitFor()
}
