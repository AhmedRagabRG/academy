"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { SettingsPage } from "@/features/organization-settings/components/settings-page"
import { EmptyState } from "@/shared/components/states/empty-state"
import { ErrorState } from "@/shared/components/states/error-state"
import { LoadingState } from "@/shared/components/states/loading-state"
import { StatusBadge } from "@/shared/components/feedback/status-badge"
import { DeleteDialog } from "@/shared/components/feedback/delete-dialog"
import { usePermission } from "@/shared/hooks/use-permission"
import { useInboxLookups } from "@/features/inbox/hooks/use-inbox-list"
import { teamsPermissions } from "../config/teams-permissions"
import {
  useAddTeamMember,
  useCreateTeam,
  useDeleteTeam,
  useRemoveTeamMember,
  useTeams,
  useUpdateTeam,
} from "../hooks/use-teams"
import type { Team } from "../types/domain"

const field =
  "border-border bg-background min-h-9 w-full rounded-lg border px-3 py-2 text-sm"

export function TeamsScreen() {
  const canCreate = usePermission(teamsPermissions.create)
  const canUpdate = usePermission(teamsPermissions.update)
  const teams = useTeams()
  const lookups = useInboxLookups()
  const create = useCreateTeam()
  const update = useUpdateTeam()
  const remove = useDeleteTeam()
  const addMember = useAddTeamMember()
  const removeMember = useRemoveTeamMember()
  const [name, setName] = useState("")
  const [pendingDelete, setPendingDelete] = useState<Team | null>(null)
  const [memberPick, setMemberPick] = useState<Record<string, string>>({})

  const employees = lookups.data?.employees ?? []
  const pending =
    update.isPending ||
    remove.isPending ||
    addMember.isPending ||
    removeMember.isPending

  return (
    <SettingsPage
      title="الفرق"
      description="الفرق التي تُسند إليها التذاكر والمحادثات، ويستخدمها المساعد الذكي في توجيه التصعيد."
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {teams.isLoading ? (
            <LoadingState label="جارٍ تحميل الفرق" />
          ) : teams.isError ? (
            <ErrorState
              message="تعذّر تحميل الفرق"
              onRetry={() => void teams.refetch()}
            />
          ) : !teams.data?.length ? (
            <EmptyState
              title="لا توجد فرق بعد"
              description="أنشئ فريقًا لتتمكن من إسناد التذاكر والمحادثات إليه."
            />
          ) : (
            teams.data.map((team) => (
              <Card key={team.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium">{team.name}</h2>
                    <StatusBadge
                      label={team.active ? "مفعّل" : "معطّل"}
                      tone={team.active ? "success" : "neutral"}
                    />
                    <span className="text-muted-foreground text-xs">
                      {team.memberCount} عضو
                    </span>
                  </div>
                  {canUpdate && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          update.mutate({ id: team.id, active: !team.active })
                        }
                      >
                        {team.active ? "تعطيل" : "تفعيل"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingDelete(team)}
                      >
                        حذف
                      </Button>
                    </div>
                  )}
                </div>

                {team.members.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {team.members.map((member) => (
                      <li
                        key={member.employeeId}
                        className="border-border flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                      >
                        {member.displayName}
                        {canUpdate && (
                          <button
                            type="button"
                            aria-label={`إزالة ${member.displayName}`}
                            className="text-muted-foreground hover:text-destructive"
                            disabled={pending}
                            onClick={() =>
                              removeMember.mutate({
                                id: team.id,
                                employeeId: member.employeeId,
                              })
                            }
                          >
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {canUpdate && (
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="text-sm">
                      <span className="mb-1 block">إضافة عضو</span>
                      <select
                        className={`${field} w-56`}
                        value={memberPick[team.id] ?? ""}
                        onChange={(event) =>
                          setMemberPick((current) => ({
                            ...current,
                            [team.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">اختر موظفًا</option>
                        {employees
                          .filter(
                            (employee) =>
                              !team.members.some(
                                (member) => member.employeeId === employee.id,
                              ),
                          )
                          .map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.label}
                            </option>
                          ))}
                      </select>
                    </label>
                    <Button
                      type="button"
                      disabled={pending || !memberPick[team.id]}
                      onClick={() => {
                        const employeeId = memberPick[team.id]
                        if (!employeeId) return
                        addMember.mutate({ id: team.id, employeeId })
                        setMemberPick((current) => ({
                          ...current,
                          [team.id]: "",
                        }))
                      }}
                    >
                      إضافة
                    </Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        {canCreate && (
          <Card className="h-fit p-4 xl:sticky xl:top-24">
            <h2 className="mb-3 font-medium">فريق جديد</h2>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                if (name.trim().length < 2) return
                create.mutate({ name: name.trim() })
                setName("")
              }}
            >
              <label className="block text-sm">
                <span className="mb-1 block">اسم الفريق</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={field}
                  placeholder="فريق القبول"
                  minLength={2}
                  maxLength={120}
                  required
                />
              </label>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "جارٍ الإنشاء..." : "إنشاء"}
              </Button>
            </form>
          </Card>
        )}
      </div>

      <DeleteDialog
        open={Boolean(pendingDelete)}
        title="حذف الفريق"
        description={`سيُحذف "${pendingDelete?.name ?? ""}" نهائيًا. إن كانت هناك تذاكر أو محادثات مسندة إليه فسيُرفض الحذف — عطّله بدلًا من ذلك.`}
        pending={remove.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return
          remove.mutate(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </SettingsPage>
  )
}
