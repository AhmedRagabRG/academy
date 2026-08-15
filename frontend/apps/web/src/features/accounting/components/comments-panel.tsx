"use client"

import { useState } from "react"
import { MessageSquarePlus } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { EmptyState } from "@/shared/components/states/empty-state"
import type { ExpenseComment } from "../types/domain"
import { commentCopy } from "../config/accounting-copy"
import { AccountingBidiValue } from "./accounting-area-states"
import { formatHistoryMoment } from "./history-mapping"

/**
 * Discussion, kept visibly separate from the approval history.
 *
 * The notice is not decoration: a reader must be able to tell at a glance which
 * of the two records is the audit trail, so nothing written here is mistaken for
 * part of it.
 */
export function CommentsPanel({
  comments,
  canAdd,
  pending = false,
  onAdd,
}: {
  comments: readonly ExpenseComment[]
  canAdd: boolean
  pending?: boolean
  onAdd: (body: string) => void
}) {
  const [body, setBody] = useState("")

  const submit = () => {
    const trimmed = body.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setBody("")
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{commentCopy.distinctNotice}</p>

      {canAdd && (
        <Card className="space-y-3">
          <label htmlFor="accounting-comment" className="sr-only">
            {commentCopy.add}
          </label>
          <textarea
            id="accounting-comment"
            rows={3}
            value={body}
            placeholder={commentCopy.placeholder}
            onChange={(event) => setBody(event.target.value)}
            className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border p-3 text-sm outline-none focus-visible:ring-2"
          />
          <div className="flex justify-end">
            <Button onClick={submit} disabled={pending || !body.trim()}>
              <MessageSquarePlus aria-hidden />
              {commentCopy.add}
            </Button>
          </div>
        </Card>
      )}

      {comments.length === 0 ? (
        <EmptyState title={commentCopy.emptyTitle} />
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id}>
              <Card className="space-y-1">
                <p className="text-sm">{comment.body}</p>
                <p className="text-muted-foreground text-xs">
                  {comment.author.name} ·{" "}
                  <AccountingBidiValue>
                    {formatHistoryMoment(comment.createdAt)}
                  </AccountingBidiValue>
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
