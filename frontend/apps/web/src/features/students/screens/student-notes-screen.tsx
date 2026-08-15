"use client"

import type { StudentId } from "../types/common"
import { studentsPermissions } from "../config/students-permissions"
import { studentsCopy } from "../config/students-copy"
import { useStudentDetail } from "../hooks/use-student-detail"
import {
  useAddStudentNote,
  useArchiveStudentNote,
  useEditStudentNote,
  useStudentNotes,
} from "../hooks/use-student-notes"
import { StudentAreaState } from "../components/student-area-states"
import { StudentNotesPanel } from "../components/student-notes-panel"

export function StudentNotesScreen({ studentId }: { studentId: string }) {
  const id = studentId as StudentId
  const detail = useStudentDetail(id)
  const notes = useStudentNotes(id)
  const add = useAddStudentNote(id)
  const edit = useEditStudentNote(id)
  const archive = useArchiveStudentNote(id)

  const canManage =
    (detail.data?.permissions.notesManage ?? false) &&
    detail.data?.status !== "archived"

  return (
    <StudentAreaState
      permission={studentsPermissions.notesView}
      loading={detail.isLoading || notes.isLoading}
      error={notes.error}
      onRetry={() => void notes.refetch()}
      loadingLabel="جارٍ تحميل الملاحظات"
    >
      <div className="space-y-4">
        {detail.data?.status === "archived" && (
          <p role="status" className="text-muted-foreground text-sm">
            {studentsCopy.archivedReadOnly}
          </p>
        )}
        <StudentNotesPanel
          notes={notes.data ?? []}
          canManage={canManage}
          pending={add.isPending || edit.isPending || archive.isPending}
          onAdd={(content) => add.mutate({ studentId: id, content })}
          onEdit={(noteId, content) =>
            edit.mutate({ studentId: id, noteId, content })
          }
          onArchive={(noteId) => archive.mutate({ studentId: id, noteId })}
        />
      </div>
    </StudentAreaState>
  )
}
