"use client"
import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { ErrorState } from "@/shared/components/states/error-state"
import { useMockPermission } from "@/features/organization-settings/hooks/use-mock-permission"
export function ProgramBatchPage({
  title,
  description,
  permission = "batches.view",
  actions,
  children,
}: {
  title: string
  description: string
  permission?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const allowed = useMockPermission(permission)
  return (
    <PageContainer>
      <PageHeader
        title={title}
        description={description}
        actions={allowed ? actions : undefined}
      />
      {allowed ? (
        children
      ) : (
        <ErrorState message="لا تملك صلاحية الوصول إلى الدفعات." />
      )}
    </PageContainer>
  )
}
