import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
test("organization profile is readable but not editable, and defaults are reachable", async ({
  page,
}) => {
  await signIn(page)
  await page.goto("/settings/organization")
  await expect(page.getByRole("heading", { name: "ملف المؤسسة" })).toBeVisible()
  await expect(page.getByText("أكاديمية السلام المهنية")).toBeVisible()
  // Code-owned configuration: the page shows it, nothing edits it.
  await expect(page.getByRole("textbox")).toHaveCount(0)
  await page.goto("/settings/general")
  await expect(
    page.getByRole("heading", { name: "الإعدادات العامة" })
  ).toBeVisible()
})
