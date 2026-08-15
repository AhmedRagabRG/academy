import type { Page } from "@playwright/test"
export async function signIn(page: Page) { await page.goto("/login"); await page.getByLabel("البريد الإلكتروني").fill("employee@alsalam.edu"); await page.locator("#password").fill("demo1234"); await page.getByRole("button", { name: "تسجيل الدخول" }).click(); await page.waitForURL("**/dashboard") }
