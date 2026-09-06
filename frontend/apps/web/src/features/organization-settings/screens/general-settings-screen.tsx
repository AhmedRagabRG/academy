"use client"
import { Card } from "@/shared/components/layout/card"
import { AdministrativeQueryState } from "../components/administrative-query-state"
import { SettingsPage } from "../components/settings-page"
import { GeneralSettingsForm } from "../forms/general-settings-form"
import { useGeneralSettings, useOrganizationLookups, useUpdateGeneralSettings } from "../hooks/use-organization-settings"

export function GeneralSettingsScreen() {
  const settings = useGeneralSettings()
  const lookups = useOrganizationLookups()
  const update = useUpdateGeneralSettings()
  const error = settings.error ?? lookups.error

  return (
    <SettingsPage
      title="الإعدادات العامة"
      description="اضبط اللغة والمنطقة الزمنية والعملات والتنسيقات والسجلات الافتراضية لكل وحدات المنصة."
    >
      <AdministrativeQueryState
        loading={settings.isLoading || lookups.isLoading}
        error={error}
      >
        {settings.data && lookups.data && (
          <Card>
            <GeneralSettingsForm
              settings={settings.data}
              lookups={lookups.data}
              pending={update.isPending}
              onSubmit={(values) =>
                update.mutate({ ...values, expectedVersion: settings.data.version })
              }
            />
          </Card>
        )}
      </AdministrativeQueryState>
    </SettingsPage>
  )
}
