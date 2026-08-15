"use client"
import { SchemaForm } from "@/features/organization-settings/forms/schema-form"
import { TextField } from "@/shared/components/forms/text-field"
import { TextareaField } from "@/shared/components/forms/textarea-field"
import {
  categorySchema,
  type CategoryFormValues,
} from "../schemas/taxonomy-schema"
export function CategoryForm({
  values = { nameAr: "", nameEn: "", description: "" },
  pending,
  onSubmit,
}: {
  values?: CategoryFormValues
  pending: boolean
  onSubmit: (values: CategoryFormValues) => void
}) {
  return (
    <SchemaForm
      schema={categorySchema}
      values={values}
      pending={pending}
      onSubmit={onSubmit}
    >
      <TextField name="nameAr" label="الاسم بالعربية" />
      <TextField name="nameEn" label="الاسم بالإنجليزية" dir="ltr" />
      <div className="md:col-span-2">
        <TextareaField name="description" label="الوصف" />
      </div>
    </SchemaForm>
  )
}
