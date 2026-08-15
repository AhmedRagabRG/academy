"use client"
import { useFieldArray, useFormContext } from "react-hook-form"
import { Button } from "@workspace/ui/components/button"
import { TextField } from "@/shared/components/forms/text-field"
import type { ProgramBatchFormValues } from "../schemas/program-batch-schema"
export function BatchInstallmentPlansSection() {
  const { control } = useFormContext<ProgramBatchFormValues>(),
    { fields, append, remove, move } = useFieldArray({
      control,
      name: "financialProfile.installmentPlans",
    })
  return (
    <fieldset>
      <legend className="font-heading text-lg font-bold">خطط التقسيط</legend>
      <div className="mt-4 space-y-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid gap-3 rounded-lg border p-4 md:grid-cols-3"
          >
            <TextField
              name={`financialProfile.installmentPlans.${index}.name`}
              label="اسم الخطة"
            />
            <TextField
              name={`financialProfile.installmentPlans.${index}.installments.0.value`}
              label="الدفعة الأولى"
              dir="ltr"
            />
            <TextField
              name={`financialProfile.installmentPlans.${index}.installments.1.value`}
              label="الدفعة الثانية"
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
              name: "",
              basis: "percentage",
              coveredCharge: "combined",
              status: "active",
              installments: [
                {
                  id: crypto.randomUUID(),
                  label: "الدفعة الأولى",
                  value: "50",
                  milestoneId: "registration-start",
                  position: 0,
                },
                {
                  id: crypto.randomUUID(),
                  label: "الدفعة الثانية",
                  value: "50",
                  milestoneId: "study-start",
                  position: 1,
                },
              ],
            })
          }
        >
          إضافة خطة
        </Button>
      </div>
    </fieldset>
  )
}
