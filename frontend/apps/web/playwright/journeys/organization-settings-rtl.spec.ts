import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
test("settings remain Arabic RTL with isolated contact values", async ({ page }) => { await signIn(page); await page.goto("/settings/users"); await expect(page.locator("html")).toHaveAttribute("dir", "rtl"); await expect(page.locator("html")).toHaveAttribute("lang", "ar"); await expect(page.locator("bdi").first()).toBeVisible() })
