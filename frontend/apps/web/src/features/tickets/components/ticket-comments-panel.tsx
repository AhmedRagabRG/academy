"use client"
import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type { TicketComment } from "../types/domain"
export function TicketCommentsPanel({
  comments,
  actorId,
  pending,
  allowed = true,
  onAdd,
  onEdit,
  onDelete,
}: {
  comments: TicketComment[]
  actorId: string
  pending?: boolean
  allowed?: boolean
  onAdd: (message: string) => Promise<unknown>
  onEdit: (id: string, message: string) => void
  onDelete: (id: string) => void
}) {
  const [message, setMessage] = useState("")
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">التعليقات الداخلية</h2>
        <span className="text-xs text-muted-foreground">
          مرئية للموظفين فقط
        </span>
      </div>
      {allowed ? (
        <form
          className="mb-5 space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            const next = message.trim()
            if (next)
              void onAdd(next)
                .then(() => setMessage(""))
                .catch(() => undefined)
          }}
        >
          <textarea
            aria-label="تعليق جديد"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-lg border border-border bg-background p-3"
            rows={3}
            placeholder="أضف تحديثاً للفريق…"
          />
          <Button type="submit" disabled={pending || !message.trim()}>
            {pending ? "جارٍ الإضافة…" : "إضافة تعليق"}
          </Button>
        </form>
      ) : (
        <p className="mb-5 text-sm text-muted-foreground">
          لا تملك صلاحية إضافة تعليق داخلي.
        </p>
      )}
      <div className="space-y-3">
        {comments.map((comment) => (
          <article key={comment.id} className="rounded-lg bg-muted/40 p-3">
            <div className="flex justify-between gap-2">
              <strong>{comment.authorName}</strong>
              <bdi dir="ltr" className="text-xs text-muted-foreground">
                {new Intl.DateTimeFormat("ar-EG", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(comment.createdAt))}
              </bdi>
            </div>
            <p className="mt-2 text-sm whitespace-pre-wrap">
              {comment.message}
            </p>
            {allowed && comment.authorId === actorId && (
              <div className="mt-2 flex gap-2">
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    const next = window.prompt("تعديل التعليق", comment.message)
                    if (next?.trim()) onEdit(comment.id, next)
                  }}
                >
                  تعديل
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm("حذف التعليق؟")) onDelete(comment.id)
                  }}
                >
                  حذف
                </Button>
              </div>
            )}
          </article>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">لا توجد تعليقات بعد.</p>
        )}
      </div>
    </section>
  )
}
