"use client"
import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type { ConversationDetail } from "../types/projections"
import type { InboxLookups } from "../services/inbox-service"
import type { EmployeeId, TeamId } from "../types/common"
import { useInboxManagement } from "../hooks/use-inbox-management"
import { employeesForBranch } from "@/features/branches/utils/branch-assignment"
export function AssignmentDialog({
  conversation,
  lookups,
  allowed,
}: {
  conversation: ConversationDetail
  lookups: InboxLookups
  allowed: boolean
}) {
  const [open, setOpen] = useState(false)
  const [employeeId, setEmployee] = useState(
    conversation.assignedEmployeeId ?? ""
  )
  const [teamId, setTeam] = useState(conversation.assignedTeamId ?? "")
  const { assign } = useInboxManagement()
  // Offering an employee who cannot see this conversation's branch would let
  // someone assign it into a black hole. The already-assigned employee is kept
  // regardless, so re-saving an untouched dialog cannot silently unassign.
  const employees = employeesForBranch(
    lookups.employees,
    conversation.branchId,
    conversation.assignedEmployeeId
  )
  if (!allowed) return null
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        الإسناد
      </Button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="assignment-title"
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-5">
            <h2 id="assignment-title" className="font-medium">
              إسناد المحادثة
            </h2>
            <label className="block text-sm">
              الموظف
              <select
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2"
                value={employeeId}
                onChange={(event) =>
                  setEmployee(event.target.value as EmployeeId)
                }
              >
                <option value="">بلا موظف</option>
                {employees.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              الفريق
              <select
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2"
                value={teamId}
                onChange={(event) => setTeam(event.target.value as TeamId)}
              >
                <option value="">بلا فريق</option>
                {lookups.teams.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button
                disabled={assign.isPending}
                onClick={() =>
                  assign.mutate(
                    {
                      conversationId: conversation.id,
                      employeeId: employeeId
                        ? (employeeId as EmployeeId)
                        : null,
                      teamId: teamId ? (teamId as TeamId) : null,
                    },
                    { onSuccess: () => setOpen(false) }
                  )
                }
              >
                حفظ
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
