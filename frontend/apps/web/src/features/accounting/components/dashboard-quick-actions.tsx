import Link from "next/link"
import { FolderTree, ListChecks, Plus } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import type { AccountingAreaPermissions } from "../types/projections"
import { categoryCopy, dashboardCopy, requestCopy } from "../config/accounting-copy"

/**
 * Shortcuts, gated by the permissions the dashboard projection reports.
 *
 * An action the user cannot perform is hidden rather than disabled — it is noise,
 * not an affordance.
 */
export function DashboardQuickActions({
  permissions,
}: {
  permissions: AccountingAreaPermissions
}) {
  const actions = [
    permissions.requestsCreate && {
      href: "/accounting/expense-requests/create",
      label: requestCopy.create,
      icon: Plus,
    },
    permissions.requestsView && {
      href: "/accounting/expense-requests",
      label: requestCopy.title,
      icon: ListChecks,
    },
    permissions.categoriesView && {
      href: "/accounting/expense-categories",
      label: categoryCopy.title,
      icon: FolderTree,
    },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Plus }[]

  if (actions.length === 0) return null

  return (
    <Card className="space-y-3">
      <h3 className="font-medium">{dashboardCopy.quickActions}</h3>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.href}
            variant="outline"
            // The rendered element is an anchor, not a <button>; saying so keeps
            // native button semantics from being claimed falsely.
            nativeButton={false}
            render={<Link href={action.href} />}
          >
            <action.icon aria-hidden />
            {action.label}
          </Button>
        ))}
      </div>
    </Card>
  )
}
