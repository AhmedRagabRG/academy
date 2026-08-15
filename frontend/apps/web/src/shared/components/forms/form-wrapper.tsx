"use client"
import { FormProvider, type FieldValues, type SubmitHandler, type UseFormReturn } from "react-hook-form"

export function FormWrapper<T extends FieldValues>({ form, onSubmit, children, pending = false }: { form: UseFormReturn<T>; onSubmit: SubmitHandler<T>; children: React.ReactNode; pending?: boolean }) {
  return <FormProvider {...form}><form onSubmit={form.handleSubmit(onSubmit)} aria-busy={pending} noValidate className="space-y-4">{children}</form></FormProvider>
}
