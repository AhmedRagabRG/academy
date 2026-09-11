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
import { branchesPermissions } from "../config/branches-permissions"
import {
  useBranches,
  useCreateBranch,
  useDeleteBranch,
  useUpdateBranch,
} from "../hooks/use-branches"
import type { Branch } from "../types/domain"

const field =
  "border-border bg-background min-h-9 w-full rounded-lg border px-3 py-2 text-sm"

export function BranchesScreen() {
  const canCreate = usePermission(branchesPermissions.create)
  const canUpdate = usePermission(branchesPermissions.update)
  const branches = useBranches()
  const create = useCreateBranch()
  const update = useUpdateBranch()
  const remove = useDeleteBranch()
  const [pendingDelete, setPendingDelete] = useState<Branch | null>(null)

  // Form fields
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")

  const pending = update.isPending || remove.isPending

  return (
    <SettingsPage
      title="الفروع"
      description="فروع المؤسسة الجغرافية. يحدّ من رؤية موظفي إلى تذاكرهم وجهات الاتصال في الفروع اليهم."
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {branches.isLoading ? (
            <LoadingState label="جارٍ تحميل الفروع" />
          ) : branches.isError ? (
            <ErrorState
              message="تعذّر تحميل الفروع"
              onRetry={() => void branches.refetch()}
            />
          ) : !branches.data?.length ? (
            <EmptyState
              title="لا توجد فروع بعد"
              description="أنشئ فرعًا لتبدأ بربط جهات الاتصال والتذاكر بمواقع المؤسسة."
            />
          ) : (
            branches.data.map((branch) => (
              <Card key={branch.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium">{branch.name}</h2>
                    <code className="text-xs text-muted-foreground">
                      {branch.code}
                    </code>
                    <StatusBadge
                      label={branch.active ? "مفعّل" : "معطّل"}
                      tone={branch.active ? "success" : "neutral"}
                    />
                  </div>
                  {canUpdate && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          update.mutate({
                            id: branch.id,
                            expectedVersion: branch.version,
                            active: !branch.active,
                          })
                        }
                      >
                        {branch.active ? "تعطيل" : "تفعيل"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingDelete(branch)}
                      >
                        حذف
                      </Button>
                    </div>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  {branch.contactCount} جهة اتصال · {branch.ticketCount} تذكرة ·{" "}
                  {branch.memberCount} موظف
                </div>

                {branch.address && <p className="text-sm">{branch.address}</p>}
              </Card>
            ))
          )}
        </div>

        {canCreate && (
          <Card className="h-fit p-4 xl:sticky xl:top-24">
            <h2 className="mb-3 font-medium">فرع جديد</h2>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                if (!name.trim() || !code.trim()) return
                create.mutate({
                  name: name.trim(),
                  code: code.trim(),
                  address: address.trim() || undefined,
                  phone: phone.trim() || undefined,
                  email: email.trim() || undefined,
                })
                setName("")
                setCode("")
                setAddress("")
                setPhone("")
                setEmail("")
              }}
            >
              <label className="block text-sm">
                <span className="mb-1 block">الاسم</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={field}
                  placeholder="القاهرة"
                  maxLength={120}
                  minLength={2}
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block">الرمز</span>
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  className={field}
                  placeholder="cairo"
                  maxLength={40}
                  minLength={2}
                  pattern="[a-z0-9-]+"
                  required
                />
                <span className="mt-1 block text-xs">
                  حروف صغيرة، أرقام، وشرطات فقط
                </span>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block">العنوان</span>
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  className={field}
                  placeholder="شارع التحرير، الإسكندرية"
                  maxLength={240}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block">الهاتف</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className={field}
                  placeholder="+2021234567890"
                  maxLength={40}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block">البريد الإلكتروني</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={field}
                  type="email"
                  placeholder="cairo@example.com"
                  maxLength={240}
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
        title="حذف الفرع"
        description={
          pendingDelete && pendingDelete.ticketCount > 0
            ? `"${pendingDelete.name}" مرتبط بـ ${pendingDelete.ticketCount} تذكرة و ${pendingDelete.memberCount} موظف. عطّله بدلًا من حذفه.`
            : `سيُحذف "${pendingDelete?.name ?? ""}" نهائيًا. لا يمكن التراجع عن هذا الإجراء.`
        }
        pending={remove.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return
          remove.mutate({
            id: pendingDelete.id,
            version: pendingDelete.version,
          })
          setPendingDelete(null)
        }}
      />
    </SettingsPage>
  )
}
