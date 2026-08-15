"use client"
import { TextField } from "@/shared/components/forms/text-field"
import { TextareaField } from "@/shared/components/forms/textarea-field"
import { SelectField } from "@/shared/components/forms/select-field"
import type { Category, ProductType } from "../types/domain"
import type { CatalogLookups } from "../types/configuration"
export function ProductBasicInformationSection({
  types,
  categories,
  lookups,
}: {
  types: ProductType[]
  categories: Category[]
  lookups: CatalogLookups
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <TextField name="officialName" label="الاسم الرسمي" />
      <TextField name="code" label="رمز المنتج" dir="ltr" />
      <TextField name="nameAr" label="الاسم بالعربية" />
      <TextField name="nameEn" label="الاسم بالإنجليزية" dir="ltr" />
      <SelectField
        name="productTypeId"
        label="نوع المنتج"
        placeholder="اختر النوع"
        options={types
          .filter((item) => item.status === "active")
          .map((item) => ({ value: item.id, label: item.nameAr }))}
      />
      <SelectField
        name="categoryId"
        label="التصنيف"
        placeholder="اختر التصنيف"
        options={categories
          .filter((item) => item.status === "active")
          .map((item) => ({ value: item.id, label: item.nameAr }))}
      />
      <SelectField
        name="departmentId"
        label="القسم"
        placeholder="بدون قسم"
        options={lookups.departments.filter((item) => item.status === "active")}
      />
      <div className="md:col-span-2">
        <TextareaField name="description" label="وصف المنتج" />
      </div>
    </div>
  )
}
