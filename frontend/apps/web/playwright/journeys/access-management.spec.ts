import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
test("users roles and permissions are independently addressable", async ({ page }) => { await signIn(page); await page.goto("/settings/users"); await expect(page.getByText("أحمد محمود")).toBeVisible(); await page.goto("/settings/roles"); await expect(page.getByText("مدير المؤسسة")).toBeVisible(); await page.goto("/settings/permissions"); await expect(page.getByRole("heading", { name: "مصفوفة الصلاحيات" })).toBeVisible(); await expect(page.getByRole("button", { name: "حفظ الصلاحيات" })).toBeVisible() })
