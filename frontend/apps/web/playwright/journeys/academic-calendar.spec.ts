import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
test("academic years and terms keep parent context", async ({ page }) => { await signIn(page); await page.goto("/settings/academic-years"); await expect(page.getByRole("cell", { name: "العام الأكاديمي 2026/2027", exact: true })).toBeVisible(); await page.goto("/settings/academic-terms"); await expect(page.getByText("الفصل الأول", { exact: true })).toBeVisible(); await expect(page.getByText("العام الأكاديمي 2026/2027", { exact: true }).first()).toBeVisible() })
