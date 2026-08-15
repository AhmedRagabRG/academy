"use client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { feedback } from "@/shared/components/feedback/toast"
import { organizationSettingsService as service } from "../services/active-organization-settings-service"
import { organizationSettingsKeys as keys } from "../services/organization-settings-query-keys"
export { useEntity, useEntityList, useEntityMutations } from "./use-entity-management"
export const usePermissionCatalog = () => useQuery({ queryKey: keys.permissionCatalog(), queryFn: () => service.getPermissionCatalog() })
export const useEffectivePermissions = (userId: string) => useQuery({ queryKey: keys.effectivePermissions(userId), queryFn: () => service.getEffectivePermissions(userId), enabled: Boolean(userId) })
export function useReplaceRolePermissions() { const client = useQueryClient(); return useMutation({ mutationFn: ({ roleId, permissionIds, version }: { roleId: string; permissionIds: string[]; version: number }) => service.replaceRolePermissions(roleId, permissionIds, version), onSuccess: (_, variables) => { feedback.success("تم حفظ صلاحيات الدور"); void client.invalidateQueries({ queryKey: keys.rolePermissions(variables.roleId) }); void client.invalidateQueries({ queryKey: [...keys.all, "roles"] }) }, onError: (error: Error) => feedback.error(error.message) }) }
