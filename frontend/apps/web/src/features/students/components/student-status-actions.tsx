"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type { StudentStatus } from "../types/common"
import type { StudentDetail } from "../types/projections"
import { studentStatusActionCopy } from "../config/students-copy"
import { useStudentStatusChange } from "../hooks/use-student-lifecycle"
import { StudentStatusDialog } from "./student-status-dialog"

/**
 * Renders exactly the transitions the policy allows for this status *and* this
 * employee's permissions. `availableStatusActions` is computed service-side from
 * the same table the service enforces, so no button can offer a refused action.
 */
export function StudentStatusActions({ student }: { student: StudentDetail }) {
  const [target, setTarget] = useState<StudentStatus>()
  const changeStatus = useStudentStatusChange()

  const actions = student.availableStatusActions
  if (actions.length === 0) return null

  return (
    <>
      {actions.map((status) => (
        <Button
          key={status}
          variant={status === "archived" ? "outline" : "outline"}
          onClick={() => setTarget(status)}
        >
          {studentStatusActionCopy[status]}
        </Button>
      ))}
      <StudentStatusDialog
        key={target ?? "closed"}
        open={target !== undefined}
        fromStatus={student.status}
        toStatus={target}
        pending={changeStatus.isPending}
        onClose={() => setTarget(undefined)}
        onConfirm={(reason) => {
          if (!target) return
          changeStatus.mutate(
            {
              studentId: student.id,
              toStatus: target,
              reason,
              expectedVersion: student.version,
            },
            { onSuccess: () => setTarget(undefined) }
          )
        }}
      />
    </>
  )
}
