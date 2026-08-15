import type { Page } from "@playwright/test"
import { signIn } from "./auth"
export async function openInbox(page: Page) {
  await signIn(page)
  await page.goto("/inbox")
  await page.getByRole("link", { name: "العودة إلى الرئيسية" }).waitFor()
  await page.getByRole("list", { name: "المحادثات" }).waitFor()
}
