"use client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { feedback } from "@/shared/components/feedback/toast"
import { organizationSettingsService as service } from "../services/active-organization-settings-service"
import { organizationSettingsKeys as keys } from "../services/organization-settings-query-keys"

export function useOrganizationProfile() { return useQuery({ queryKey: keys.profile(), queryFn: () => service.getProfile() }) }
export function useGeneralSettings() { return useQuery({ queryKey: keys.settings(), queryFn: () => service.getGeneralSettings() }) }
export function useOrganizationLookups() { return useQuery({ queryKey: keys.lookups(), queryFn: () => service.getLookups() }) }
export function useUpdateGeneralSettings() { const client = useQueryClient(); return useMutation({ mutationFn: service.updateGeneralSettings, onSuccess: (data) => { client.setQueryData(keys.settings(), data); feedback.success("تم حفظ الإعدادات العامة") }, onError: (error: Error) => feedback.error(error.message) }) }
