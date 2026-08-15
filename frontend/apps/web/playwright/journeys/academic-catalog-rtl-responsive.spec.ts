import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
test("catalog is RTL and does not create page overflow", async ({ page }) => {
  await signIn(page)
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto("/academic-catalog/products")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth
  )
  expect(overflow).toBe(false)
})
