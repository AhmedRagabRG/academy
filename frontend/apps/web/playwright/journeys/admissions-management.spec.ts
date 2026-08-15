import { expect, test } from "@playwright/test"
import { openAdmissions } from "../helpers/admissions"

test("admissions list, detail, create, and edit routes are usable", async ({
  page,
}) => {
  await openAdmissions(page)
  await expect(
    page.getByRole("heading", { name: "القبول والتسجيل" })
  ).toBeVisible()
  await page.getByRole("button", { name: /تسجيل متقدم/ }).click()
  await expect(page.getByRole("heading", { name: "تسجيل متقدم" })).toBeVisible()
  await expect(page.getByLabel("الاسم الكامل")).toBeVisible()
  await page.goto("/admissions/admission-mariam-1")
  await expect(
    page.getByRole("heading", { name: "تفاصيل طلب القبول" })
  ).toBeVisible()
  await page.getByRole("button", { name: /تعديل الطلب/ }).click()
  await expect(page.getByRole("button", { name: /حفظ/ })).toBeVisible()
})
