"use client"
import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { AdministrativeQueryState } from "../components/administrative-query-state"
import { SettingsPage } from "../components/settings-page"
import { useEntity } from "../hooks/use-access-management"
export function RoleDetailScreen({ roleId }: { roleId: string }) { const role = useEntity("roles", roleId); return <SettingsPage title={role.data?.name ?? "تفاصيل الدور"} description="ملخص الدور والصلاحيات المرتبطة به." actions={<Button nativeButton={false} render={<Link href={`/settings/permissions?roleId=${roleId}`} />}>إدارة الصلاحيات</Button>}><AdministrativeQueryState loading={role.isLoading} error={role.error}>{role.data && <Card><p>{role.data.description}</p><p className="text-muted-foreground mt-4 text-sm">{role.data.permissionIds.length} صلاحية مرتبطة · الإصدار {role.data.version}</p></Card>}</AdministrativeQueryState></SettingsPage> }
