import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
test("settings actions remain reachable without page overflow", async ({ page }) => { await signIn(page); await page.goto("/settings/users"); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true); await page.evaluate(() => { document.body.style.zoom = "2" }); await expect(page.getByRole("heading", { name: "المستخدمون" })).toBeVisible() })
