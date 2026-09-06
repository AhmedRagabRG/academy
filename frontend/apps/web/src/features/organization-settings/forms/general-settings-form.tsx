"use client"
import { SelectField } from "@/shared/components/forms/select-field"
import { WeekdayField } from "@/shared/components/forms/weekday-field"
import type { OrganizationLookups } from "../services/organization-settings-service"
import { generalSettingsSchema, type GeneralSettingsInput } from "../schemas/general-settings-schema"
import type { GeneralSettings } from "../types/domain"
import { SchemaForm } from "./schema-form"

export function GeneralSettingsForm({
  settings,
  lookups,
  pending,
  onSubmit,
}: {
  settings: GeneralSettings
  lookups: OrganizationLookups
  pending: boolean
  onSubmit: (values: GeneralSettingsInput) => void
}) {
  const values: GeneralSettingsInput = {
    defaultLanguage: settings.defaultLanguage,
    timeZone: settings.timeZone,
    currency: settings.currency,
    dateFormat: settings.dateFormat,
    numberFormat: settings.numberFormat,
    workingDays: settings.workingDays,
  }

  return (
    <SchemaForm schema={generalSettingsSchema} values={values} pending={pending} onSubmit={onSubmit}>
      <SelectField name="defaultLanguage" label="اللغة الافتراضية" options={lookups.languages} />
      <SelectField name="timeZone" label="المنطقة الزمنية" options={lookups.timeZones} />
      <SelectField name="currency" label="العملة" options={lookups.currencies} />
      <SelectField name="dateFormat" label="تنسيق التاريخ" options={lookups.dateFormats} />
      <SelectField name="numberFormat" label="تنسيق الأرقام" options={lookups.numberFormats} />
      <div className="md:col-span-2">
        <WeekdayField name="workingDays" label="أيام العمل" options={lookups.weekdays} />
      </div>
    </SchemaForm>
  )
}
