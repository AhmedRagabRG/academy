"use client"

import { useEffect, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { StatusBadge } from "@/shared/components/feedback/status-badge"
import { usePermission } from "@/shared/hooks/use-permission"
import { inboxPermissions } from "../config/inbox-permissions"
import { usePauseAi, useResumeAi } from "../hooks/use-inbox-management"
import type { ConversationDetail } from "../types/projections"

const pauseReasons = {
  "human-reply": "ردّ موظف على المحادثة",
  manual: "إيقاف يدوي",
  escalated: "تم تصعيد المحادثة",
  handoff: "تم تحويل المحادثة إلى موظف",
  "error-budget": "تكررت أخطاء المساعد",
} as const

const relativeTime = new Intl.RelativeTimeFormat("ar", { numeric: "auto" })

function relative(iso: string, now: number) {
  const seconds = Math.round((Date.parse(iso) - now) / 1000)
  const absolute = Math.abs(seconds)
  if (absolute < 60) return relativeTime.format(seconds, "second")
  if (absolute < 3600)
    return relativeTime.format(Math.round(seconds / 60), "minute")
  if (absolute < 86400)
    return relativeTime.format(Math.round(seconds / 3600), "hour")
  return relativeTime.format(Math.round(seconds / 86400), "day")
}

export function AiControlPanel({
  conversation,
}: {
  conversation: ConversationDetail
}) {
  const canControl = usePermission(inboxPermissions.aiControl)
  const pause = usePauseAi()
  const resume = useResumeAi()
  // The countdown is intentionally seeded from the browser wall clock.
  // eslint-disable-next-line react-hooks/purity
  const [now, setNow] = useState(Date.now())
  const ai = conversation.ai

  useEffect(() => {
    if (!ai?.resumeAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [ai?.resumeAt])

  const disabled = !ai?.agentEnabled || ai.mode === "off"
  const paused = ai?.mode === "paused"
  const pending = pause.isPending || resume.isPending
  const status = disabled
    ? { label: "معطّل", tone: "neutral" as const }
    : paused
      ? { label: "متوقف مؤقتًا", tone: "warning" as const }
      : { label: "نشط", tone: "success" as const }

  return (
    <section
      dir="rtl"
      aria-labelledby="ai-control-title"
      className="rounded-xl border bg-muted/20 p-3"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id="ai-control-title" className="font-medium">
          مساعد الذكاء الاصطناعي
        </h3>
        <StatusBadge label={status.label} tone={status.tone} />
      </div>

      {paused && ai.pausedReason && (
        <p className="mt-2 text-sm text-muted-foreground">
          سبب الإيقاف: {pauseReasons[ai.pausedReason]}
        </p>
      )}
      {paused && ai.resumeAt && (
        <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
          الاستئناف التلقائي {relative(ai.resumeAt, now)}
        </p>
      )}
      {paused && !ai.resumeAt && (
        <p className="mt-1 text-sm text-muted-foreground">
          لن يُستأنف تلقائيًا
        </p>
      )}

      {canControl && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending || disabled || paused}
            onClick={() =>
              ai &&
              pause.mutate({ id: conversation.id, expectedVersion: ai.version })
            }
          >
            إيقاف المساعد
          </Button>
          <Button
            type="button"
            disabled={pending || disabled || !paused}
            onClick={() =>
              ai &&
              resume.mutate({
                id: conversation.id,
                expectedVersion: ai.version,
              })
            }
          >
            تشغيل المساعد
          </Button>
        </div>
      )}
    </section>
  )
}
