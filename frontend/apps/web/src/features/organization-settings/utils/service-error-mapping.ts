import type { FieldValues, Path, UseFormSetError } from "react-hook-form"
import { OrganizationSettingsError } from "../services/organization-settings-error"

export function applyServiceErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>) {
  if (!(error instanceof OrganizationSettingsError) || !error.fieldErrors) return false
  Object.entries(error.fieldErrors).forEach(([field, message]) => setError(field as Path<T>, { type: "server", message }))
  return true
}
export const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : "حدث خطأ غير متوقع"
