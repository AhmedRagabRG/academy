"use client"

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { CalendarClock, GripVertical, Phone, UserRound } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import type {
  Lead,
  LeadStageId,
  PipelineAgent,
  PipelineStage,
} from "../types/domain"
import {
  formatPipelineDate,
  formatPipelineMoney,
  PriorityBadge,
  SourceLabel,
  stageAccentClasses,
} from "./lead-ui"

const PIPELINE_RENDERED_AT = Date.now()

function LeadCard({
  lead,
  agents,
  stages,
  canMove,
  onOpen,
  onMove,
}: {
  lead: Lead
  agents: PipelineAgent[]
  stages: PipelineStage[]
  canMove: boolean
  onOpen: () => void
  onMove: (stageId: LeadStageId) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    disabled: !canMove,
    data: { leadId: lead.id },
  })
  const agent = agents.find((item) => item.id === lead.assignedAgentId)
  const overdue = Boolean(
    lead.nextActionAt &&
    new Date(lead.nextActionAt).getTime() < PIPELINE_RENDERED_AT
  )

  return (
    <article
      ref={setNodeRef}
      className={cn(
        "rounded-lg border bg-card shadow-[0_10px_28px_-24px_#0b2a4a] transition-opacity",
        isDragging && "opacity-45"
      )}
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <PriorityBadge priority={lead.priority} />
        <button
          type="button"
          disabled={!canMove}
          className="grid size-8 cursor-grab place-items-center rounded-md text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40"
          aria-label={`اسحب فرصة ${lead.contactName} إلى مرحلة أخرى`}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="block w-full px-3 py-3 text-start focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <strong className="block truncate text-sm text-brand-navy dark:text-foreground">
              {lead.contactName}
            </strong>
            <span className="mt-1 block truncate text-xs text-muted-foreground">
              {lead.program}
            </span>
          </span>
          <SourceLabel source={lead.source} />
        </span>
        <span className="mt-3 block text-base font-medium" data-numeric>
          {formatPipelineMoney(lead.value)}
        </span>
        <span className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1" dir="ltr">
            <Phone className="size-3.5" aria-hidden />
            {lead.phone}
          </span>
          <span className="inline-flex items-center gap-1">
            <UserRound className="size-3.5" aria-hidden />
            {agent?.name ?? "غير مسند"}
          </span>
          {lead.nextActionAt && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                overdue && "font-medium text-red-700 dark:text-red-300"
              )}
            >
              <CalendarClock className="size-3.5" aria-hidden />
              {overdue ? "متأخرة · " : "المتابعة · "}
              {formatPipelineDate(lead.nextActionAt)}
            </span>
          )}
        </span>
      </button>
      <div className="border-t px-3 py-2">
        <label className="grid gap-1 text-[0.68rem] text-muted-foreground">
          نقل إلى مرحلة
          <select
            value={lead.stageId}
            disabled={!canMove}
            onChange={(event) => onMove(event.target.value as LeadStageId)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
            aria-label={`نقل فرصة ${lead.contactName} إلى مرحلة`}
          >
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </article>
  )
}

function PipelineColumn({
  stage,
  leads,
  agents,
  stages,
  canMove,
  onOpen,
  onMove,
}: {
  stage: PipelineStage
  leads: Lead[]
  agents: PipelineAgent[]
  stages: PipelineStage[]
  canMove: boolean
  onOpen: (leadId: string) => void
  onMove: (leadId: string, stageId: LeadStageId) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const total = leads.reduce((sum, lead) => sum + lead.value, 0)
  const weighted = total * (stage.probability / 100)

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`pipeline-stage-${stage.id}`}
      className={cn(
        "flex h-full w-[20rem] shrink-0 snap-start flex-col overflow-hidden rounded-xl border bg-card",
        isOver && "ring-2 ring-brand-blue ring-offset-2 ring-offset-background"
      )}
    >
      <header className="shrink-0 border-b px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                "mt-0.5 h-8 w-1 shrink-0 rounded-full",
                stageAccentClasses[stage.accent]
              )}
              aria-hidden
            />
            <div className="min-w-0">
              <h2
                id={`pipeline-stage-${stage.id}`}
                className="truncate text-sm font-medium text-brand-navy dark:text-foreground"
              >
                {stage.name}
              </h2>
              <p className="mt-1 truncate text-[0.68rem] text-muted-foreground">
                {stage.description}
              </p>
            </div>
          </div>
          <span
            className="rounded-md bg-muted px-2 py-1 text-xs font-medium"
            data-numeric
          >
            {leads.length}
          </span>
        </div>
      </header>
      <div className="min-h-72 flex-1 space-y-3 overflow-y-auto bg-muted/25 p-3">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            agents={agents}
            stages={stages}
            canMove={canMove}
            onOpen={() => onOpen(lead.id)}
            onMove={(stageId) => onMove(lead.id, stageId)}
          />
        ))}
        {!leads.length && (
          <div className="grid min-h-36 place-items-center rounded-lg border border-dashed p-4 text-center">
            <p className="text-xs leading-5 text-muted-foreground">
              اسحب فرصة إلى هنا
              <br />
              أو استخدم قائمة المرحلة داخل البطاقة
            </p>
          </div>
        )}
      </div>
      <footer className="shrink-0 border-t px-4 py-3 text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">إجمالي القيمة</span>
          <strong data-numeric>{formatPipelineMoney(total)}</strong>
        </div>
        <div className="mt-1.5 flex justify-between gap-3">
          <span className="text-muted-foreground">
            القيمة المرجحة ({stage.probability}%)
          </span>
          <strong data-numeric>{formatPipelineMoney(weighted)}</strong>
        </div>
      </footer>
    </section>
  )
}

export function PipelineBoard({
  stages,
  leads,
  agents,
  canMove,
  onOpen,
  onMove,
}: {
  stages: PipelineStage[]
  leads: Lead[]
  agents: PipelineAgent[]
  canMove: boolean
  onOpen: (leadId: string) => void
  onMove: (leadId: string, stageId: LeadStageId) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const onDragEnd = (event: DragEndEvent) => {
    const leadId = event.active.data.current?.leadId as string | undefined
    const stageId = event.over?.id as LeadStageId | undefined
    if (leadId && stageId) onMove(leadId, stageId)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "اضغط مفتاح المسافة لالتقاط الفرصة، واستخدم الأسهم للتحريك، ثم اضغط المسافة للإفلات أو Escape للإلغاء.",
        },
      }}
    >
      <div
        className="flex h-[calc(100dvh-18rem)] min-h-[32rem] snap-x gap-4 overflow-x-auto overflow-y-hidden p-4"
        aria-label="لوحة مسار المبيعات"
      >
        {stages.map((stage) => (
          <PipelineColumn
            key={stage.id}
            stage={stage}
            leads={leads.filter((lead) => lead.stageId === stage.id)}
            agents={agents}
            stages={stages}
            canMove={canMove}
            onOpen={onOpen}
            onMove={onMove}
          />
        ))}
      </div>
    </DndContext>
  )
}
