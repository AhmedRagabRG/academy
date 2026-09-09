"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CalendarClock,
  Mail,
  MessageSquareText,
  Pencil,
  Phone,
  UserRound,
} from "lucide-react"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { priorityLabels } from "../config/pipeline-configuration"
import type {
  Lead,
  LeadDraft,
  LeadPriority,
  LeadStageId,
  PipelineAgent,
  PipelineContact,
  PipelineStage,
} from "../types/domain"
import {
  formatPipelineDate,
  formatPipelineMoney,
  PriorityBadge,
  SourceLabel,
  stageAccentClasses,
} from "./lead-ui"

const toDateTimeLocal = (value?: string) =>
  value ? new Date(value).toISOString().slice(0, 16) : ""

function LeadForm({
  initial,
  contacts,
  agents,
  editing,
  onSubmit,
  onCancel,
}: {
  initial?: Lead
  contacts: PipelineContact[]
  agents: PipelineAgent[]
  editing?: boolean
  onSubmit: (draft: LeadDraft) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<LeadDraft>(() => ({
    contactId: initial?.contactId ?? contacts[0]?.id ?? "",
    assignedAgentId: initial?.assignedAgentId ?? "",
    priority: initial?.priority ?? "medium",
    value: initial ? String(initial.value) : "",
    program: initial?.program ?? "",
    nextActionAt: toDateTimeLocal(initial?.nextActionAt),
  }))
  const patch = <Key extends keyof LeadDraft>(
    key: Key,
    value: LeadDraft[Key]
  ) => setDraft((current) => ({ ...current, [key]: value }))

  return (
    <form
      className="space-y-4 p-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (!draft.contactId || !draft.program.trim()) return
        onSubmit(draft)
      }}
    >
      <label className="grid gap-1.5 text-sm font-medium">
        جهة الاتصال
        <select
          value={draft.contactId}
          disabled={editing}
          onChange={(event) => patch("contactId", event.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 disabled:opacity-60"
        >
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name} · {contact.phone}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        البرنامج أو الاحتياج
        <Input
          required
          value={draft.program}
          onChange={(event) => patch("program", event.target.value)}
          placeholder="مثال: دبلومة إدارة المشروعات"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <label className="grid gap-1.5 text-sm font-medium">
          القيمة المتوقعة
          <Input
            type="number"
            min="0"
            value={draft.value}
            onChange={(event) => patch("value", event.target.value)}
            placeholder="0"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          الأولوية
          <select
            value={draft.priority}
            onChange={(event) =>
              patch("priority", event.target.value as LeadPriority)
            }
            className="h-10 rounded-lg border border-input bg-background px-3"
          >
            {Object.entries(priorityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-1.5 text-sm font-medium">
        المسؤول
        <select
          value={draft.assignedAgentId}
          onChange={(event) => patch("assignedAgentId", event.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3"
        >
          <option value="">غير مسند</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        موعد المتابعة التالية
        <Input
          type="datetime-local"
          value={draft.nextActionAt}
          onChange={(event) => patch("nextActionAt", event.target.value)}
        />
      </label>
      <div className="flex gap-2 border-t pt-4">
        <Button type="submit">
          {editing ? "حفظ التعديلات" : "إنشاء الفرصة"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </form>
  )
}

export function CreateLeadPanel({
  contacts,
  agents,
  onBack,
  onCreate,
}: {
  contacts: PipelineContact[]
  agents: PipelineAgent[]
  onBack: () => void
  onCreate: (draft: LeadDraft) => void
}) {
  return (
    <aside
      className="h-full overflow-y-auto bg-card"
      aria-label="إضافة فرصة مبيعات"
    >
      <header className="border-b px-5 py-4">
        <Button variant="ghost" className="mb-3 xl:hidden" onClick={onBack}>
          <ArrowRight aria-hidden />
          اللوحة
        </Button>
        <p className="text-xs font-medium text-brand-blue">فرصة جديدة</p>
        <h2 className="mt-1 text-lg font-medium text-brand-navy dark:text-foreground">
          تحويل جهة اتصال إلى فرصة
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          إذا لم تحدد مسؤولًا ستبدأ الفرصة في مرحلة «غير مسند».
        </p>
      </header>
      <LeadForm
        contacts={contacts}
        agents={agents}
        onCancel={onBack}
        onSubmit={onCreate}
      />
    </aside>
  )
}

export function LeadDetailPanel({
  lead,
  stages,
  agents,
  contacts,
  canUpdate,
  canMove,
  onBack,
  onMove,
  onUpdate,
  onAddNote,
}: {
  lead: Lead
  stages: PipelineStage[]
  agents: PipelineAgent[]
  contacts: PipelineContact[]
  canUpdate: boolean
  canMove: boolean
  onBack: () => void
  onMove: (stageId: LeadStageId) => void
  onUpdate: (draft: LeadDraft) => void
  onAddNote: (note: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const stage = stages.find((item) => item.id === lead.stageId)
  const agent = agents.find((item) => item.id === lead.assignedAgentId)

  return (
    <aside
      className="h-full overflow-y-auto bg-card"
      aria-label={`تفاصيل فرصة ${lead.contactName}`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card/95 px-4 py-3 backdrop-blur-sm xl:hidden">
        <Button variant="ghost" onClick={onBack}>
          <ArrowRight aria-hidden />
          اللوحة
        </Button>
        <span className="text-sm font-medium">تفاصيل الفرصة</span>
      </div>
      <header className="border-b px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SourceLabel source={lead.source} />
            <h2 className="mt-1 truncate text-xl font-medium text-brand-navy dark:text-foreground">
              {lead.contactName}
            </h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {lead.program}
            </p>
          </div>
          <PriorityBadge priority={lead.priority} />
        </div>
        <div className="mt-4 flex gap-2">
          <Link
            href={`/inbox?contact=${lead.contactId}`}
            aria-label={`مراسلة ${lead.contactName}`}
            className={buttonVariants({ variant: "outline", size: "icon-lg" })}
          >
            <MessageSquareText aria-hidden />
          </Link>
          <a
            href={`tel:${lead.phone.replace(/\s/g, "")}`}
            aria-label={`الاتصال بـ ${lead.contactName}`}
            className={buttonVariants({ variant: "outline", size: "icon-lg" })}
          >
            <Phone aria-hidden />
          </a>
          {canUpdate && (
            <Button
              variant="outline"
              size="icon-lg"
              aria-label="تعديل الفرصة"
              onClick={() => setEditing((value) => !value)}
            >
              <Pencil aria-hidden />
            </Button>
          )}
        </div>
      </header>

      {editing ? (
        <LeadForm
          initial={lead}
          contacts={contacts}
          agents={agents}
          editing
          onCancel={() => setEditing(false)}
          onSubmit={(draft) => {
            onUpdate(draft)
            setEditing(false)
          }}
        />
      ) : (
        <>
          <section
            className="border-b px-5 py-4"
            aria-labelledby="lead-stage-title"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  stage && stageAccentClasses[stage.accent]
                )}
                aria-hidden
              />
              <h3 id="lead-stage-title" className="text-sm font-medium">
                المرحلة الحالية
              </h3>
            </div>
            <select
              value={lead.stageId}
              disabled={!canMove}
              onChange={(event) => onMove(event.target.value as LeadStageId)}
              className="mt-3 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              aria-label="المرحلة الحالية"
            >
              {stages.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.probability}%
                </option>
              ))}
            </select>
          </section>
          <section
            className="border-b px-5 py-4"
            aria-labelledby="lead-data-title"
          >
            <h3 id="lead-data-title" className="text-sm font-medium">
              بيانات الفرصة
            </h3>
            <dl className="mt-3 divide-y text-sm">
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="text-muted-foreground">القيمة</dt>
                <dd className="font-medium" data-numeric>
                  {formatPipelineMoney(lead.value)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="inline-flex items-center gap-1 text-muted-foreground">
                  <UserRound className="size-4" aria-hidden /> المسؤول
                </dt>
                <dd>{agent?.name ?? "غير مسند"}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="inline-flex items-center gap-1 text-muted-foreground">
                  <Phone className="size-4" aria-hidden /> الهاتف
                </dt>
                <dd dir="ltr">{lead.phone}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="inline-flex items-center gap-1 text-muted-foreground">
                  <Mail className="size-4" aria-hidden /> البريد
                </dt>
                <dd dir="ltr" className="max-w-44 truncate">
                  {lead.email ?? "غير مضاف"}
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="inline-flex items-center gap-1 text-muted-foreground">
                  <CalendarClock className="size-4" aria-hidden /> المتابعة
                </dt>
                <dd>
                  {lead.nextActionAt
                    ? formatPipelineDate(lead.nextActionAt, true)
                    : "غير محددة"}
                </dd>
              </div>
            </dl>
          </section>
        </>
      )}

      <section className="px-5 py-4" aria-labelledby="lead-activity-title">
        <h3 id="lead-activity-title" className="text-sm font-medium">
          سجل المتابعة
        </h3>
        {canUpdate && (
          <form
            className="mt-3"
            onSubmit={async (event) => {
              event.preventDefault()
              const content = note.trim()
              if (!content || savingNote) return
              setSavingNote(true)
              try {
                await onAddNote(content)
                setNote("")
              } catch {
                // The caller already surfaced a toast; keep the text for retry.
              } finally {
                setSavingNote(false)
              }
            }}
          >
            <label htmlFor="lead-note" className="sr-only">
              ملاحظة متابعة
            </label>
            <textarea
              id="lead-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={savingNote}
              placeholder="أضف نتيجة مكالمة أو خطوة تالية…"
              className="min-h-20 w-full resize-y rounded-lg border border-input bg-background p-3 text-sm focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              type="submit"
              size="sm"
              className="mt-2"
              disabled={!note.trim() || savingNote}
            >
              إضافة للسجل
            </Button>
          </form>
        )}
        <ol className="mt-4 space-y-0">
          {lead.activities.map((activity, index) => (
            <li
              key={activity.id}
              className="relative grid grid-cols-[1rem_1fr] gap-3 pb-4"
            >
              <span className="relative mt-1.5 size-2.5 rounded-full bg-brand-blue ring-4 ring-brand-blue/10" />
              {index < lead.activities.length - 1 && (
                <span
                  className="absolute inset-y-4 start-[0.3rem] w-px bg-border"
                  aria-hidden
                />
              )}
              <div>
                <p className="text-sm leading-6" dir="auto">
                  {activity.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {activity.actorName} ·{" "}
                  {formatPipelineDate(activity.occurredAt, true)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  )
}
