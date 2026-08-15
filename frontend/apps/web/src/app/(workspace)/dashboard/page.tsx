import type { Metadata } from "next"
import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { EmptyState } from "@/shared/components/states/empty-state"

export const metadata: Metadata = { title: "الرئيسية" }
export default function DashboardPage() { return <PageContainer><PageHeader title="الرئيسية" description="مساحة العمل الأساسية للعمليات التعليمية" /><EmptyState title="ستظهر وحدات العمل هنا عند إضافتها" /></PageContainer> }
