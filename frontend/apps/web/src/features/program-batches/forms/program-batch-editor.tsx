"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormProvider, useForm } from "react-hook-form"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import type { BatchCapacity, BatchLookups } from "../types/domain"
import {
  programBatchSchema,
  type ProgramBatchFormValues,
} from "../schemas/program-batch-schema"
import { BatchBasicSection } from "./batch-basic-section"
import { BatchScheduleSection } from "./batch-schedule-section"
import { BatchCapacitySection } from "./batch-capacity-section"
import { BatchFinancialSection } from "./batch-financial-section"
import { BatchInstallmentPlansSection } from "./batch-installment-plans-section"
import { BatchOffersSection } from "./batch-offers-section"
import { BatchBranchesSection } from "./batch-branches-section"
import { useBatchUnsavedChanges } from "../hooks/use-batch-unsaved-changes"
import { BatchPermission } from "../components/program-batch-permission-boundary"
export function ProgramBatchEditor({
  lookups,
  values,
  capacity,
  locked = false,
  pending,
  onSubmit,
}: {
  lookups: BatchLookups
  values: ProgramBatchFormValues
  capacity?: BatchCapacity
  locked?: boolean
  pending?: boolean
  onSubmit: (values: ProgramBatchFormValues) => void
}) {
  const form = useForm<ProgramBatchFormValues>({
    resolver: zodResolver(programBatchSchema),
    defaultValues: values,
  })
  useBatchUnsavedChanges(form.formState.isDirty)
  return (
    <FormProvider {...form}>
      <form
        className="space-y-6"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <Card>
          <BatchBasicSection lookups={lookups} locked={locked} />
        </Card>
        <Card>
          <BatchScheduleSection />
        </Card>
        <BatchPermission permission="batches.capacity.manage">
          <Card>
            <BatchCapacitySection capacity={capacity} />
          </Card>
        </BatchPermission>
        <BatchPermission permission="batches.pricing.manage">
          <Card className="space-y-6">
            <BatchFinancialSection />
            <BatchInstallmentPlansSection />
            <BatchOffersSection />
          </Card>
        </BatchPermission>
        <BatchPermission permission="batches.branches.manage">
          <Card>
            <BatchBranchesSection lookups={lookups} />
          </Card>
        </BatchPermission>
        {Object.keys(form.formState.errors).length > 0 && (
          <div
            role="alert"
            className="rounded-lg border border-destructive p-3 text-sm text-destructive"
          >
            راجع الحقول المطلوبة قبل الحفظ.
          </div>
        )}
        <div className="sticky bottom-4 flex justify-end rounded-lg border bg-card/95 p-3 shadow-lg">
          <Button type="submit" disabled={pending}>
            {pending ? "جارٍ الحفظ..." : "حفظ الدفعة"}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
