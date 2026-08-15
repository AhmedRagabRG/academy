"use client"
import { useFormContext } from "react-hook-form"
import { TextField } from "@/shared/components/forms/text-field"
import { SelectField } from "@/shared/components/forms/select-field"
import { SwitchField } from "@/shared/components/forms/switch-field"
import type { ProductFormValues } from "../schemas/product-schema"
import type { ProductType } from "../types/domain"
import type {
  CatalogLookups,
  AcademicFieldDefinition,
} from "../types/configuration"
export function ProductAcademicSection({
  types,
  lookups,
}: {
  types: ProductType[]
  lookups: CatalogLookups
}) {
  const { watch } = useFormContext<ProductFormValues>()
  const type = types.find((item) => item.id === watch("productTypeId"))
  const render = (field: AcademicFieldDefinition) => {
    const name = `academic.${field.key}`
    if (field.key === "durationUnit")
      return (
        <SelectField
          key={field.key}
          name={name}
          label={field.label}
          options={lookups.durationUnits}
        />
      )
    if (field.key === "studyMode")
      return (
        <SelectField
          key={field.key}
          name={name}
          label={field.label}
          options={lookups.studyModes}
        />
      )
    if (field.kind === "boolean")
      return <SwitchField key={field.key} name={name} label={field.label} />
    return (
      <TextField
        key={field.key}
        name={name}
        label={field.label}
        type="number"
        dir="ltr"
      />
    )
  }
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {type ? (
        [...type.fields].sort((a, b) => a.position - b.position).map(render)
      ) : (
        <p className="text-sm text-muted-foreground md:col-span-2">
          اختر نوع المنتج لإظهار الحقول الأكاديمية المناسبة.
        </p>
      )}
    </div>
  )
}
