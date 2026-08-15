"use client"
import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { ErrorState } from "@/shared/components/states/error-state"
import { useMockPermission } from "@/features/organization-settings/hooks/use-mock-permission"
export function CatalogPage({
  title,
  description,
  actions,
  permission,
  children,
}: {
  title: string
  description: string
  actions?: React.ReactNode
  permission?: string
  children: React.ReactNode
}) {
  const allowed = useMockPermission(permission ?? "dashboard.view")
  return (
    <PageContainer>
      <PageHeader title={title} description={description} actions={!permission || allowed ? actions : undefined} />
      {permission && !allowed ? <ErrorState message="لا تملك صلاحية عرض هذه الصفحة." /> : children}
    </PageContainer>
  )
}
