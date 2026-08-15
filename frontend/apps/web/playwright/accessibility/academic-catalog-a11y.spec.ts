import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { signIn } from "../helpers/auth"
test("catalog primary routes have no serious accessibility violations", async ({
  page,
}) => {
  await signIn(page)
  for (const route of [
    "/academic-catalog",
    "/academic-catalog/products",
    "/academic-catalog/product-types",
    "/academic-catalog/categories",
    "/academic-catalog/products/product-leadership",
    "/academic-catalog/products/product-leadership/edit",
  ]) {
    await page.goto(route)
    await page.locator("main").waitFor()
    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations.filter((item) =>
        ["critical", "serious"].includes(item.impact ?? "")
      )
    ).toEqual([])
  }
})
