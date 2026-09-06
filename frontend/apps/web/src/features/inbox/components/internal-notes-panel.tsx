"use client"
import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import type { ConversationDetail } from "../types/projections"
import { useInboxNotes } from "../hooks/use-inbox-notes"
import { inboxCopy } from "../config/inbox-copy"
export function InternalNotesPanel({
  conversation,
  allowed,
}: {
  conversation: ConversationDetail
  allowed: boolean
}) {
  const [content, setContent] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const notes = useInboxNotes(conversation.id)
  return (
    <section aria-labelledby="notes-title" className="space-y-3">
      <div>
        <h3 id="notes-title" className="font-medium">
          الملاحظات الداخلية
        </h3>
        <p className="text-xs text-muted-foreground">{inboxCopy.privateNote}</p>
      </div>
      {allowed && (
        <div>
          <textarea
            className="min-h-20 w-full rounded-lg border border-input bg-background p-2 text-sm"
            aria-label="محتوى الملاحظة"
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          <Button
            size="sm"
            disabled={!content.trim() || notes.add.isPending}
            onClick={() =>
              notes.add.mutate(content, { onSuccess: () => setContent("") })
            }
          >
            إضافة ملاحظة
          </Button>
        </div>
      )}
      <div className="space-y-2">
        {conversation.notes.map((note) => (
          <article
            key={note.id}
            className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-amber-950 dark:bg-amber-950/20 dark:text-amber-50"
          >
            <div className="flex justify-between gap-2">
              <strong className="text-xs">{note.authorName}</strong>
              <time className="text-xs opacity-70">
                {new Intl.DateTimeFormat("ar-EG", {
                  dateStyle: "short",
                }).format(new Date(note.createdAt))}
              </time>
            </div>
            {editing === note.id ? (
              <div className="mt-2 space-y-2">
                <textarea
                  aria-label="تعديل محتوى الملاحظة"
                  className="w-full rounded-lg border p-2 text-sm text-foreground"
                  value={editContent}
                  onChange={(event) => setEditContent(event.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="xs"
                    onClick={() =>
                      notes.edit.mutate(
                        { noteId: note.id, content: editContent },
                        { onSuccess: () => setEditing(null) }
                      )
                    }
                  >
                    حفظ
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setEditing(null)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            ) : (
              <p dir="auto" className="mt-2 text-sm">
                {note.content}
              </p>
            )}
            {allowed &&
              note.authorEmployeeId === "employee-demo" &&
              editing !== note.id && (
                <div className="mt-2 flex gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="تعديل الملاحظة"
                    title="تعديل الملاحظة"
                    onClick={() => {
                      setEditing(note.id)
                      setEditContent(note.content)
                    }}
                  >
                    <Pencil aria-hidden />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="حذف الملاحظة"
                    title="حذف الملاحظة"
                    className="text-destructive hover:text-destructive"
                    onClick={() => notes.remove.mutate(note.id)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              )}
          </article>
        ))}
      </div>
    </section>
  )
}
