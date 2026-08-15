"use client"

import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { ErrorState } from "@/shared/components/states/error-state"
import { LoadingState } from "@/shared/components/states/loading-state"
import { useMockPermission } from "@/features/organization-settings/hooks/use-mock-permission"

export function AdmissionsPermission({
  permission,
  children,
  fallback = null,
}: {
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return useMockPermission(permission) ? children : fallback
}

export function AdmissionsPage({
  title,
  description,
  actions,
  children,
  permission = "admissions.view",
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  permission?: string
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
        <ErrorState message="لا تملك صلاحية الوصول إلى طلبات القبول." />
      )}
    </PageContainer>
  )
}

export function AdmissionQueryState({
  loading,
  error,
  onRetry,
  children,
}: {
  loading: boolean
  error?: Error | null
  onRetry?: () => void
  children: React.ReactNode
}) {
  if (loading) return <LoadingState label="جارٍ تحميل طلب القبول" />
  if (error) return <ErrorState message={error.message} onRetry={onRetry} />
  return children
}

export function AdmissionBidiValue({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <bdi dir="ltr" className="font-medium">
      {children}
    </bdi>
  )
}
