"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@workspace/ui/components/button"
import { FormProvider, useForm, useWatch, type Resolver } from "react-hook-form"
import { TextField } from "@/shared/components/forms/text-field"
import { TextareaField } from "@/shared/components/forms/textarea-field"
import {
  productTypeSchema,
  type ProductTypeFormValues,
} from "../schemas/taxonomy-schema"
import type { AcademicFieldKey } from "../types/configuration"
const definitions: Array<{
  key: AcademicFieldKey
  label: string
  kind: "number" | "option" | "boolean"
}> = [
  { key: "duration", label: "المدة", kind: "number" },
  { key: "durationUnit", label: "وحدة المدة", kind: "option" },
  { key: "termCount", label: "عدد الفصول", kind: "number" },
  { key: "sessionCount", label: "عدد الجلسات", kind: "number" },
  { key: "hourCount", label: "عدد الساعات", kind: "number" },
  { key: "studyMode", label: "نمط الدراسة", kind: "option" },
  { key: "trainingIncluded", label: "تدريب متضمن", kind: "boolean" },
  { key: "internshipIncluded", label: "تدريب عملي", kind: "boolean" },
  { key: "certificateIncluded", label: "شهادة متضمنة", kind: "boolean" },
  { key: "finalProjectRequired", label: "مشروع نهائي", kind: "boolean" },
]
export function ProductTypeForm({
  values = {
    nameAr: "",
    nameEn: "",
    description: "",
    fields: definitions
      .slice(0, 2)
      .map((item, position) => ({ ...item, required: true, position })),
  },
  pending,
  onSubmit,
}: {
  values?: ProductTypeFormValues
  pending: boolean
  onSubmit: (values: ProductTypeFormValues) => void
}) {
  const form = useForm<ProductTypeFormValues>({
    resolver: zodResolver(productTypeSchema) as Resolver<ProductTypeFormValues>,
    defaultValues: values,
  })
  const selected = useWatch({ control: form.control, name: "fields" }) ?? []
  const toggle = (definition: (typeof definitions)[number], checked: boolean) =>
    form.setValue(
      "fields",
      checked
        ? [
            ...selected,
            { ...definition, required: false, position: selected.length },
          ]
        : selected.filter((item) => item.key !== definition.key),
      { shouldDirty: true }
    )
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="nameAr" label="الاسم بالعربية" />
          <TextField name="nameEn" label="الاسم بالإنجليزية" dir="ltr" />
          <div className="md:col-span-2">
            <TextareaField name="description" label="الوصف" />
          </div>
        </div>
        <fieldset className="rounded-lg border p-4">
          <legend className="px-2 font-medium">الحقول الأكاديمية</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {definitions.map((definition) => (
              <label
                key={definition.key}
                className="flex min-h-10 items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={selected.some((item) => item.key === definition.key)}
                  onChange={(event) => toggle(definition, event.target.checked)}
                />
                {definition.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "جارٍ الحفظ..." : "حفظ النوع"}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
