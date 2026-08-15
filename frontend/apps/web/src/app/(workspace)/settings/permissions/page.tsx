import type { Metadata } from "next"
import { Suspense } from "react"
import { PermissionsScreen } from "@/features/organization-settings"
import { LoadingState } from "@/shared/components/states/loading-state"
export const metadata: Metadata = { title: "الصلاحيات" }
export default function Page() { return <Suspense fallback={<LoadingState />}><PermissionsScreen /></Suspense> }
