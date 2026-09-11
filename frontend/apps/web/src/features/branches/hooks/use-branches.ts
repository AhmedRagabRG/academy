import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { feedback } from "@/shared/components/feedback/toast"
import { branchesService } from "../services/branches-service"
import type {
  BranchId,
  CreateBranchCommand,
  UpdateBranchCommand,
} from "../types/domain"

export const branchKeys = { all: ["branches"] as const }
export const accountBranchKeys = { all: ["branches", "accounts"] as const }

export function useBranches() {
  return useQuery({
    queryKey: branchKeys.all,
    queryFn: ({ signal }) => branchesService.list(signal),
  })
}

export function useAccounts() {
  return useQuery({
    queryKey: accountBranchKeys.all,
    queryFn: ({ signal }) => branchesService.accounts(signal),
  })
}

function useBranchMutation<TVariables>(
  run: (variables: TVariables) => Promise<unknown>,
  success: string
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: branchKeys.all })
      await client.invalidateQueries({ queryKey: accountBranchKeys.all })
      feedback.success(success)
    },
    onError: (error: Error) => feedback.error(error.message),
  })
}

export const useCreateBranch = () =>
  useBranchMutation(
    (command: CreateBranchCommand) => branchesService.create(command),
    "تم إنشاء الفرع"
  )

export const useUpdateBranch = () =>
  useBranchMutation(
    (command: UpdateBranchCommand) => branchesService.update(command),
    "تم حفظ التغييرات"
  )

export const useDeleteBranch = () =>
  useBranchMutation(
    ({ id, version }: { id: BranchId; version: number }) =>
      branchesService.remove(id, version),
    "تم حذف الفرع"
  )

export const useSetAccountBranches = () => {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      accountId,
      branchIds,
    }: {
      accountId: string
      branchIds: string[]
    }) => branchesService.setAccountBranches(accountId, branchIds),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: accountBranchKeys.all })
      feedback.success("تم تحديث إعدادات الفرع")
    },
    onError: (error: Error) => feedback.error(error.message),
  })
}
