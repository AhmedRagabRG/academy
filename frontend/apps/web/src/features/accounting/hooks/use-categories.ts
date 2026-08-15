"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type {
  CategoryListQuery,
  CreateCategoryCommand,
  CreateSubCategoryCommand,
  SetCategoryStatusCommand,
  SetSubCategoryStatusCommand,
  SubCategoryListQuery,
  UpdateCategoryCommand,
  UpdateSubCategoryCommand,
} from "../types/commands"
import { accountingService } from "../services/active-accounting-service"
import {
  accountingKeys,
  invalidationTargets,
} from "../services/accounting-query-keys"
import { AccountingError } from "../services/accounting-error"
import { accountingCopy } from "../config/accounting-copy"
import { useAccountingScopeFingerprint } from "./use-accounting-scope"

export function useCategories(query: CategoryListQuery) {
  const fingerprint = useAccountingScopeFingerprint()
  return useQuery({
    queryKey: accountingKeys.categories(fingerprint, query),
    queryFn: ({ signal }) => accountingService.listCategories(query, signal),
    placeholderData: (previous) => previous,
  })
}

export function useSubCategories(query: SubCategoryListQuery) {
  const fingerprint = useAccountingScopeFingerprint()
  return useQuery({
    queryKey: accountingKeys.subCategories(fingerprint, query),
    queryFn: ({ signal }) => accountingService.listSubCategories(query, signal),
    placeholderData: (previous) => previous,
  })
}

const reportError = (error: unknown) => {
  if (error instanceof AccountingError)
    toast.error(
      error.code === "version-conflict" ? accountingCopy.conflict : error.message
    )
  else toast.error(accountingCopy.retry)
}

/**
 * A category change invalidates the queue and the dashboard too — a renamed or
 * archived category changes what both display, so neither may keep a stale copy.
 */
function useCategoryMutation<TCommand, TResult>(
  run: (command: TCommand) => Promise<TResult>,
  message: (result: TResult) => string
) {
  const client = useQueryClient()
  const fingerprint = useAccountingScopeFingerprint()

  return useMutation({
    mutationFn: run,
    onSuccess: async (result) => {
      await Promise.all(
        invalidationTargets({ kind: "category", fingerprint }).map((queryKey) =>
          client.invalidateQueries({ queryKey })
        )
      )
      toast.success(message(result))
    },
    onError: reportError,
  })
}

export function useCreateCategory() {
  return useCategoryMutation<CreateCategoryCommand, { name: string }>(
    (command) => accountingService.createCategory(command),
    (result) => `تم إنشاء تصنيف ${result.name}`
  )
}

export function useUpdateCategory() {
  return useCategoryMutation<UpdateCategoryCommand, { name: string }>(
    (command) => accountingService.updateCategory(command),
    () => "تم حفظ التصنيف"
  )
}

export function useSetCategoryStatus() {
  return useCategoryMutation<SetCategoryStatusCommand, { status: string }>(
    (command) => accountingService.setCategoryStatus(command),
    (result) => (result.status === "archived" ? "تمت أرشفة التصنيف" : "تم تفعيل التصنيف")
  )
}

export function useCreateSubCategory() {
  return useCategoryMutation<CreateSubCategoryCommand, { name: string }>(
    (command) => accountingService.createSubCategory(command),
    (result) => `تم إنشاء تصنيف فرعي ${result.name}`
  )
}

export function useUpdateSubCategory() {
  return useCategoryMutation<UpdateSubCategoryCommand, { name: string }>(
    (command) => accountingService.updateSubCategory(command),
    () => "تم حفظ التصنيف الفرعي"
  )
}

export function useSetSubCategoryStatus() {
  return useCategoryMutation<SetSubCategoryStatusCommand, { status: string }>(
    (command) => accountingService.setSubCategoryStatus(command),
    (result) =>
      result.status === "archived"
        ? "تمت أرشفة التصنيف الفرعي"
        : "تم تفعيل التصنيف الفرعي"
  )
}
