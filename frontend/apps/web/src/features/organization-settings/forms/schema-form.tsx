"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@workspace/ui/components/button"
import { useEffect } from "react"
import { useForm, type DefaultValues, type FieldValues, type Resolver } from "react-hook-form"
import type { z } from "zod"
import { FormWrapper } from "@/shared/components/forms/form-wrapper"
import { applyServiceErrors } from "../utils/service-error-mapping"

/**
 * A schema-validated settings form.
 *
 * `error` is the rejection from the save, not merely something to display. The
 * API answers a refused write with per-field messages, and the toast that
 * accompanies it says "review the highlighted fields" — so those messages have
 * to land on the fields themselves. Server rules the client cannot know in
 * advance (a code already taken, a record changed in another session) are only
 * ever reported this way.
 */
export function SchemaForm<T extends FieldValues>({ schema, values, pending, error, submitLabel = "حفظ التغييرات", onSubmit, children }: { schema: z.ZodType<T>; values: DefaultValues<T>; pending?: boolean; error?: unknown; submitLabel?: string; onSubmit: (values: T) => void | Promise<void>; children: React.ReactNode }) {
  const form = useForm<T>({ resolver: zodResolver(schema as never) as Resolver<T>, defaultValues: values })
  useEffect(() => form.reset(values), [form, values])
  const { setError } = form
  useEffect(() => {
    if (error) applyServiceErrors(error, setError)
  }, [error, setError])
  return <FormWrapper form={form} onSubmit={onSubmit} pending={pending}><div className="grid gap-5 md:grid-cols-2">{children}</div><div className="flex justify-end border-t pt-5"><Button type="submit" disabled={pending}>{pending ? "جارٍ الحفظ..." : submitLabel}</Button></div></FormWrapper>
}
