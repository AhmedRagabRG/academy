"use client"

import Link from "next/link"
import { Pencil } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { PageHeader } from "@/shared/components/layout/page-header"
import type { StudentDetail } from "../types/projections"
import { studentsCopy, studentFieldsCopy } from "../config/students-copy"
import { StudentStatusBadge } from "./student-status-badge"
import { StudentBidiValue } from "./student-area-states"
import { StudentStatusActions } from "./student-status-actions"
import { formatDate } from "../utils/student-format"

export function StudentWorkspaceHeader({ student }: { student: StudentDetail }) {
  const canEdit = student.permissions.update && student.status !== "archived"

  return (
    <div className="space-y-3">
      <PageHeader
        title={student.identity.fullName}
        description={studentsCopy.workspaceDescription}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <Button
                nativeButton={false}
                render={<Link href={`/students/${student.id}/edit`} />}
              >
                <Pencil aria-hidden />
                {studentsCopy.edit}
              </Button>
            )}
            <StudentStatusActions student={student} />
          </div>
        }
      />
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <StudentStatusBadge status={student.status} />
        <span>
          {studentFieldsCopy.studentCode}:{" "}
          <StudentBidiValue className="font-medium">
            {student.studentCode}
          </StudentBidiValue>
        </span>
        <span>
          {studentFieldsCopy.admissionReference}:{" "}
          <StudentBidiValue className="font-medium">
            {student.system.admissionReference}
          </StudentBidiValue>
        </span>
        <span>
          {studentFieldsCopy.enrollmentDate}:{" "}
          <StudentBidiValue className="font-medium">
            {formatDate(student.system.enrollmentDate)}
          </StudentBidiValue>
        </span>
        <span>
          {studentFieldsCopy.registrationBranch}:{" "}
          <span className="font-medium">
            {student.assignment.registrationBranchLabel}
          </span>
        </span>
      </div>
      {student.status === "archived" && (
        <p
          role="status"
          className="border-border bg-muted/40 rounded-lg border p-3 text-sm"
        >
          {studentsCopy.archivedReadOnly}
        </p>
      )}
    </div>
  )
}
