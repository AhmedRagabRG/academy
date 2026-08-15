"use client"
import { useFieldArray, useFormContext } from "react-hook-form"
import { Button } from "@workspace/ui/components/button"
import { TextField } from "@/shared/components/forms/text-field"
import { SelectField } from "@/shared/components/forms/select-field"
import type { ProgramBatchFormValues } from "../schemas/program-batch-schema"
export function BatchOffersSection() {
  const { control } = useFormContext<ProgramBatchFormValues>(),
    { fields, append, remove, move } = useFieldArray({
      control,
      name: "financialProfile.offers",
    })
  return (
    <fieldset>
      <legend className="font-heading text-lg font-bold">
        الخصومات والمنح
      </legend>
      <div className="mt-4 space-y-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid gap-3 rounded-lg border p-4 md:grid-cols-3"
          >
            <TextField
              name={`financialProfile.offers.${index}.name`}
              label="اسم العرض"
            />
            <SelectField
              name={`financialProfile.offers.${index}.kind`}
              label="النوع"
              options={[
                { value: "discount", label: "خصم" },
                { value: "scholarship", label: "منحة" },
              ]}
            />
            <TextField
              name={`financialProfile.offers.${index}.value`}
              label="القيمة"
              dir="ltr"
            />
            <div className="col-span-full flex gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
              >
                نقل لأعلى
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => remove(index)}
              >
                إزالة
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            append({
              id: crypto.randomUUID(),
              kind: "discount",
              name: "",
              valueType: "percentage",
              value: "10",
              status: "active",
            })
          }
        >
          إضافة خصم أو منحة
        </Button>
      </div>
    </fieldset>
  )
}
