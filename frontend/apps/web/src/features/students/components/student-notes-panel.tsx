"use client"

import { useState } from "react"
import { Archive, Pencil } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { EmptyState } from "@/shared/components/states/empty-state"
import type { StudentNoteId } from "../types/common"
import type { StudentNote } from "../types/domain"
import { notesCopy } from "../config/students-copy"
import { studentNoteSchema } from "../schemas/student-note-schema"
import { formatDateTime } from "../utils/student-format"
import { StudentBidiValue } from "./student-area-states"

/**
 * Internal notes. Authorship and creation time are preserved for the life of the
 * note, including after the author leaves the organization (spec FR-021).
 */
export function StudentNotesPanel({
  notes,
  canManage,
  pending,
  onAdd,
  onEdit,
  onArchive,
}: {
  notes: readonly StudentNote[]
  canManage: boolean
  pending: boolean
  onAdd: (content: string) => void
  onEdit: (noteId: StudentNoteId, content: string) => void
  onArchive: (noteId: StudentNoteId) => void
}) {
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string>()
  const [editing, setEditing] = useState<StudentNoteId>()
  const [editDraft, setEditDraft] = useState("")

  const submit = () => {
    const parsed = studentNoteSchema.safeParse({ content: draft })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message)
      return
    }
    setError(undefined)
    onAdd(parsed.data.content)
    setDraft("")
  }

  const submitEdit = (noteId: StudentNoteId) => {
    const parsed = studentNoteSchema.safeParse({ content: editDraft })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message)
      return
    }
    setError(undefined)
    onEdit(noteId, parsed.data.content)
    setEditing(undefined)
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <Card className="space-y-3">
          <label htmlFor="student-note" className="text-sm font-medium">
            {notesCopy.add}
          </label>
          <textarea
            id="student-note"
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={notesCopy.placeholder}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "student-note-error" : undefined}
            className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border p-3 text-sm outline-none focus-visible:ring-2"
          />
          {error && (
            <p
              id="student-note-error"
              role="alert"
              className="text-destructive text-sm"
            >
              {error}
            </p>
          )}
          <Button onClick={submit} disabled={pending}>
            {pending ? "جارٍ الحفظ..." : notesCopy.add}
          </Button>
        </Card>
      )}

      {notes.length === 0 ? (
        <EmptyState title={notesCopy.empty} />
      ) : (
        <ol className="space-y-3">
          {notes.map((note) => (
            <li key={note.id}>
              <Card className="space-y-2">
                <div className="text-muted-foreground flex flex-wrap items-baseline justify-between gap-2 text-xs">
                  <span>
                    {note.author.name}
                    {!note.author.active && " (غير نشط)"}
                  </span>
                  <span>
                    <StudentBidiValue>
                      {formatDateTime(note.createdAt)}
                    </StudentBidiValue>
                    {note.editedAt && ` · ${notesCopy.edited}`}
                  </span>
                </div>

                {editing === note.id ? (
                  <div className="space-y-2">
                    <label htmlFor={`note-edit-${note.id}`} className="sr-only">
                      {notesCopy.editTitle}
                    </label>
                    <textarea
                      id={`note-edit-${note.id}`}
                      rows={3}
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value)}
                      className="border-input bg-background focus-visible:ring-ring w-full rounded-lg border p-3 text-sm outline-none focus-visible:ring-2"
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => submitEdit(note.id)} disabled={pending}>
                        حفظ
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setEditing(undefined)}
                      >
                        إلغاء
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{note.content}</p>
                )}

                {canManage && editing !== note.id && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditing(note.id)
                        setEditDraft(note.content)
                      }}
                    >
                      <Pencil aria-hidden />
                      تعديل
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onArchive(note.id)}
                      disabled={pending}
                    >
                      <Archive aria-hidden />
                      أرشفة
                    </Button>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
