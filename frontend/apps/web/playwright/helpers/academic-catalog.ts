import type { Page } from "@playwright/test"
import { signIn } from "./auth"
export async function openAcademicCatalog(page: Page, route = "/academic-catalog") { await signIn(page); await page.goto(route); await page.locator("main").waitFor() }
