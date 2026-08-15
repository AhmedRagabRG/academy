import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
export function SettingsPage({ title, description, actions, children }: { title: string; description: string; actions?: React.ReactNode; children: React.ReactNode }) { return <PageContainer className="space-y-7"><PageHeader title={title} description={description} actions={actions} />{children}</PageContainer> }
