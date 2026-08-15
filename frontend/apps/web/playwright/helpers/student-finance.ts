import type { Page } from "@playwright/test"
import { signIn } from "./auth"

/** Seeded records the finance journeys rely on. */
export const seededStudentId = "student-STD-2026-00001"
export const seededStudentCode = "STD-2026-00001"
/** Issued, nothing collected — the invoice used for reductions and payments. */
export const unpaidStudentCode = "STD-2026-00003"
/** The only draft invoice in the fixtures. */
export const draftStudentCode = "STD-2026-00007"

export const financeRoutes = {
  dashboard: "/student-finance",
  invoices: "/student-finance/invoices",
  createInvoice: "/student-finance/invoices/create",
  payments: "/student-finance/payments",
  installments: "/student-finance/installments",
  refunds: "/student-finance/refunds",
  studentWorkspace: `/students/${seededStudentId}/finance`,
} as const

export const allFinanceRoutes = Object.values(financeRoutes)

export async function openFinance(page: Page, route: string = financeRoutes.dashboard) {
  await signIn(page)
  await page.goto(route)
  await page.locator("main").waitFor()
}

/** Opens the first invoice in the queue and returns its detail URL. */
export async function openFirstInvoice(page: Page): Promise<string> {
  await openFinance(page, financeRoutes.invoices)
  await page.getByRole("link", { name: /INV-/ }).first().click()
  await page.locator("main").waitFor()
  return page.url()
}

export async function searchQueue(page: Page, term: string) {
  const search = page.getByRole("searchbox").first()
  await search.fill(term)
  // The queues filter as you type; wait for the row count to settle.
  await page.waitForTimeout(300)
}

export const viewports = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 800 },
  tablet: { width: 834, height: 1112 },
} as const
