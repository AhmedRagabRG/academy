import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
test("settings primary controls expose keyboard focus", async ({ page }) => { await signIn(page); await page.goto("/settings/branches"); const create = page.getByRole("button", { name: "إضافة جديد" }); await create.focus(); await expect(create).toBeFocused(); await page.keyboard.press("Enter"); await expect(page.getByLabel("اسم الفرع")).toBeVisible() })
