"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type Resolver } from "react-hook-form"
import { Button } from "@workspace/ui/components/button"
import { createTicketSchema } from "../schemas/ticket-schemas"
import { ticketConfiguration } from "../config/ticket-configuration"
import type { CreateTicketInput } from "../types/commands"
import type { TicketConfiguration } from "../types/domain"

export function TicketForm({
  onSubmit,
  pending,
  configuration = ticketConfiguration,
}: {
  onSubmit: (value: CreateTicketInput) => void
  pending?: boolean
  configuration?: TicketConfiguration
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema) as Resolver<CreateTicketInput>,
    defaultValues: {
      title: "",
      description: "",
      status: "backlog",
      priority: "medium",
      departmentId: configuration.departments[0]?.id ?? "",
      tags: [],
    },
  })
  const field =
    "border-border bg-background min-h-9 w-full rounded-lg border px-3 py-2 text-sm"
  return (
    <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
      <label className="grid gap-1 text-sm">
        العنوان
        <input className={field} {...register("title")} />
        {errors.title && (
          <span className="text-xs text-destructive">
            {errors.title.message}
          </span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        الوصف
        <textarea rows={4} className={field} {...register("description")} />
        {errors.description && (
          <span className="text-xs text-destructive">
            {errors.description.message}
          </span>
        )}
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">
          الحالة
          <select className={field} {...register("status")}>
            {configuration.statuses
              .filter((s) => s.id !== "archived")
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          الأولوية
          <select className={field} {...register("priority")}>
            {configuration.priorities.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          القسم
          <select className={field} {...register("departmentId")}>
            {configuration.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الإنشاء…" : "إنشاء التذكرة"}
      </Button>
    </form>
  )
}
