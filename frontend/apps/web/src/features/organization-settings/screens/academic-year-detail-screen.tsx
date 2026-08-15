"use client"
import { Card } from "@/shared/components/layout/card"
import { AdministrativeQueryState } from "../components/administrative-query-state"
import { SettingsPage } from "../components/settings-page"
import { useEntity } from "../hooks/use-entity-management"
export function AcademicYearDetailScreen({ yearId }: { yearId: string }) { const year = useEntity("academic-years", yearId); return <SettingsPage title={year.data?.name ?? "العام الأكاديمي"} description="ملخص النطاق الزمني والحالة الحالية."><AdministrativeQueryState loading={year.isLoading} error={year.error}>{year.data && <Card><dl className="grid gap-4 sm:grid-cols-3"><div><dt className="text-muted-foreground text-sm">البداية</dt><dd>{year.data.startDate}</dd></div><div><dt className="text-muted-foreground text-sm">النهاية</dt><dd>{year.data.endDate}</dd></div><div><dt className="text-muted-foreground text-sm">الحالة</dt><dd>{year.data.status}</dd></div></dl></Card>}</AdministrativeQueryState></SettingsPage> }
