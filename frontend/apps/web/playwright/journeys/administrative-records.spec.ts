import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
test("settings list exposes search and pagination", async ({ page }) => { await signIn(page); await page.goto("/settings/branches"); await expect(page.getByRole("searchbox")).toBeVisible(); await expect(page.getByText(/صفحة 1/)).toBeVisible() })
