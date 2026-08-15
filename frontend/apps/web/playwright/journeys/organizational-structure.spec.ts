import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
test("branch and department lists are service-backed", async ({ page }) => { await signIn(page); await page.goto("/settings/branches"); await expect(page.getByRole("heading", { name: "الفروع" })).toBeVisible(); await expect(page.getByText("فرع القاهرة", { exact: true })).toBeVisible(); await page.goto("/settings/departments"); await expect(page.getByText("القبول والتسجيل", { exact: true })).toBeVisible() })
