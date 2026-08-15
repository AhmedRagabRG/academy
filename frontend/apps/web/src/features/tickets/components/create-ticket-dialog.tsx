"use client"
import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { TicketForm } from "../forms/ticket-form"
import type { CreateTicketInput } from "../types/commands"
import type { TicketConfiguration } from "../types/domain"
export function CreateTicketDialog({
  onCreate,
  pending,
  configuration,
}: {
  onCreate: (value: CreateTicketInput) => Promise<unknown>
  pending?: boolean
  configuration: TicketConfiguration
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        إنشاء تذكرة
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-ticket-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-background p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 id="create-ticket-title" className="text-xl font-bold">
                إنشاء تذكرة جديدة
              </h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="إغلاق"
                onClick={() => setOpen(false)}
              >
                <X />
              </Button>
            </div>
            <TicketForm
              configuration={configuration}
              pending={pending}
              onSubmit={(value) => {
                void onCreate(value)
                  .then(() => setOpen(false))
                  .catch(() => undefined)
              }}
            />
          </section>
        </div>
      )}
    </>
  )
}
