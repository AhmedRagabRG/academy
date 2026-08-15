"use client"

import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { usePermission } from "@/shared/hooks/use-permission"
import { financeCopy } from "../config/finance-copy"
import { financePermissions } from "../config/finance-permissions"
import { FinanceForbiddenState } from "./finance-area-states"

/**
 * Page shell with a route-level permission gate.
 *
 * This is an affordance only — the service performs the authoritative check on
 * every operation, so hiding a control never stands in for enforcement.
 */
export function FinancePage({
  title,
  description,
  actions,
  children,
  permission = financePermissions.view,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  permission?: string
}) {
  const allowed = usePermission(permission)
  return (
    <PageContainer>
      <PageHeader
        title={title}
        description={description}
        actions={allowed ? actions : undefined}
      />
      {allowed ? children : <FinanceForbiddenState message={financeCopy.forbidden} />}
    </PageContainer>
  )
}
