"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { SettingsPage } from "@/features/organization-settings/components/settings-page"
import { EmptyState } from "@/shared/components/states/empty-state"
import { ErrorState } from "@/shared/components/states/error-state"
import { LoadingState } from "@/shared/components/states/loading-state"
import { StatusBadge } from "@/shared/components/feedback/status-badge"
import { useAccounts, useSetAccountBranches } from "../hooks/use-branches"
import type { AccountBranchSetting } from "../types/domain"
import { useBranches } from "../hooks/use-branches"

export function AccountBranchesScreen() {
  const accounts = useAccounts()
  const branches = useBranches()
  const setBranches = useSetAccountBranches()
  const [expanded, setExpanded] = useState<string | null>(null)

  if (accounts.isLoading || branches.isLoading)
    return <LoadingState label="جارٍ التحميل" />

  if (accounts.isError || branches.isError)
    return (
      <ErrorState
        message="تعذّر تحميل البيانات"
        onRetry={() => {
          accounts.refetch()
          branches.refetch()
        }}
      />
    )

  if (!accounts.data?.length)
    return (
      <EmptyState
        title="لا يوجد موظفون"
        description="لم يتم العثور على حسابات موظفين نشطين."
      />
    )

  const allBranchIds = branches.data?.map((b) => b.id) ?? []

  return (
    <SettingsPage
      title="تعيين الفروع للموظفين"
      description="حدد أي فروع يرىها كل موظف. القائمة الفارغة تعني رؤية غير مقيدة — يرى كل شيء."
    >
      <div className="space-y-4">
        {accounts.data.map((account) => (
          <Card key={account.accountId} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium">{account.displayName}</h2>
                <p className="text-sm text-muted-foreground">
                  {account.organizationWide
                    ? "يرى كل الفروع"
                    : account.branchIds.length === 0
                      ? "يرى كل الفروع غير المقيّد"
                      : `${account.branchIds.length} فرع`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setExpanded(
                    expanded === account.accountId ? null : account.accountId
                  )
                }
              >
                {expanded === account.accountId ? "إغلاق" : "تعديل"}
              </Button>
            </div>

            {expanded === account.accountId && branches.data && (
              <form
                className="mt-3 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  const data = new FormData(event.currentTarget)
                  const selected = allBranchIds.filter(
                    (id) => data.get(`branch-${id}`) === "on"
                  )
                  setBranches.mutate({
                    accountId: account.accountId,
                    branchIds: selected,
                  })
                  setExpanded(null)
                }}
              >
                <div className="space-y-2">
                  {branches.data.map((branch) => (
                    <label
                      key={branch.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        name={`branch-${branch.id}`}
                        defaultChecked={account.branchIds.includes(branch.id)}
                        disabled={setBranches.isPending}
                        className="h-4 w-4 rounded border-border"
                      />
                      <span>{branch.name}</span>
                      <StatusBadge
                        label={branch.active ? "مفعّل" : "معطّل"}
                        tone={branch.active ? "success" : "neutral"}
                      />
                    </label>
                  ))}
                </div>
                <Button type="submit" disabled={setBranches.isPending}>
                  {setBranches.isPending ? "جارٍ الحفظ..." : "حفظ"}
                </Button>
              </form>
            )}
          </Card>
        ))}
      </div>
    </SettingsPage>
  )
}
