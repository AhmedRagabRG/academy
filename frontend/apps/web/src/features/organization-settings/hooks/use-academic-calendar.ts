"use client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { feedback } from "@/shared/components/feedback/toast"
import { organizationSettingsService as service } from "../services/active-organization-settings-service"
import { organizationSettingsKeys as keys } from "../services/organization-settings-query-keys"
export { useEntityList, useEntityMutations } from "./use-entity-management"
export function useActivateAcademicYear() { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, version }: { id: string; version: number }) => service.activateAcademicYear(id, version), onSuccess: () => { feedback.success("تم تفعيل العام الأكاديمي"); void client.invalidateQueries({ queryKey: [...keys.all, "academic-years"] }); void client.invalidateQueries({ queryKey: keys.settings() }) }, onError: (error: Error) => feedback.error(error.message) }) }
