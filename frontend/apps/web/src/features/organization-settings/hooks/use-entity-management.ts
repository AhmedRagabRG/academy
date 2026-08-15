"use client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { feedback } from "@/shared/components/feedback/toast"
import type { ListQuery } from "../types/common"
import type { EntityByKind, EntityKind } from "../services/organization-settings-service"
import { organizationSettingsService as service } from "../services/active-organization-settings-service"
import { organizationSettingsKeys as keys } from "../services/organization-settings-query-keys"

export function useEntityList<K extends EntityKind>(kind: K, query: ListQuery) { return useQuery({ queryKey: keys.list(kind, query), queryFn: () => service.list(kind, query), placeholderData: (previous) => previous }) }
export function useEntity<K extends EntityKind>(kind: K, id: string) { return useQuery({ queryKey: keys.detail(kind, id), queryFn: () => service.get(kind, id), enabled: Boolean(id) }) }
export function useEntityMutations<K extends EntityKind>(kind: K) {
  const client = useQueryClient()
  const refresh = () => client.invalidateQueries({ queryKey: [...keys.all, kind] })
  const success = (message: string) => { feedback.success(message); void refresh() }
  return {
    create: useMutation({ mutationFn: (input: Parameters<typeof service.create<K>>[1]) => service.create(kind, input), onSuccess: () => success("تم إنشاء السجل"), onError: (error: Error) => feedback.error(error.message) }),
    update: useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<EntityByKind[K]> & { expectedVersion: number } }) => service.update(kind, id, input), onSuccess: () => success("تم تحديث السجل"), onError: (error: Error) => feedback.error(error.message) }),
    status: useMutation({ mutationFn: ({ id, status, version }: { id: string; status: EntityByKind[K]["status"]; version: number }) => service.changeStatus(kind, id, status, version), onSuccess: () => success("تم تحديث الحالة"), onError: (error: Error) => feedback.error(error.message) }),
  }
}
