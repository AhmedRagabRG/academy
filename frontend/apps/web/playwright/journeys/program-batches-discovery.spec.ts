import { expect, test } from "@playwright/test"
import { openProgramBatches } from "../helpers/program-batches"
test("batch discovery filters and pagination are accessible", async ({
  page,
}) => {
  await openProgramBatches(page)
  await expect(
    page.getByRole("combobox", { name: "الحالة", exact: true }),
  ).toBeVisible()
  await expect(page.getByRole("searchbox", { name: "بحث" })).toBeVisible()
  await expect(page.getByRole("button", { name: "التالي" })).toBeVisible()
})
