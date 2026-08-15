"use client"
import { Card } from "@/shared/components/layout/card"
import { AdministrativeQueryState } from "../components/administrative-query-state"
import { SettingsPage } from "../components/settings-page"
import { GeneralSettingsForm } from "../forms/general-settings-form"
import { useEntityList } from "../hooks/use-entity-management"
import { useGeneralSettings, useOrganizationLookups, useUpdateGeneralSettings } from "../hooks/use-organization-settings"
import { defaultListQuery } from "../utils/list-query-state"
export function GeneralSettingsScreen() { const settings = useGeneralSettings(); const lookups = useOrganizationLookups(); const branches = useEntityList("branches", { ...defaultListQuery, pageSize: 50 }); const years = useEntityList("academic-years", { ...defaultListQuery, pageSize: 50 }); const update = useUpdateGeneralSettings(); const error = settings.error ?? lookups.error ?? branches.error ?? years.error; return <SettingsPage title="الإعدادات العامة" description="اضبط اللغة والمنطقة الزمنية والعملات والتنسيقات والسجلات الافتراضية لكل وحدات المنصة."><AdministrativeQueryState loading={settings.isLoading || lookups.isLoading || branches.isLoading || years.isLoading} error={error}>{settings.data && lookups.data && branches.data && years.data && <Card><GeneralSettingsForm settings={settings.data} lookups={lookups.data} branches={branches.data.items} years={years.data.items} pending={update.isPending} onSubmit={(values) => update.mutate({ ...values, expectedVersion: settings.data.version })} /></Card>}</AdministrativeQueryState></SettingsPage> }
