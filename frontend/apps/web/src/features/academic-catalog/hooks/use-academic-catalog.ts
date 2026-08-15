"use client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { feedback } from "@/shared/components/feedback/toast"
import { academicCatalogService as service } from "../services/active-academic-catalog-service"
import { catalogKeys as keys } from "../services/academic-catalog-query-keys"
import type { ProductListQuery } from "../types/common"
import type { TaxonomyListQuery } from "../services/academic-catalog-service"
import type {
  CategoryInput,
  CreateProductCommand,
  ProductTypeInput,
  TransitionProductCommand,
  UpdateProductCommand,
} from "../types/commands"

const failed = (error: Error) => feedback.error(error.message)
export const useCatalogLookups = () =>
  useQuery({ queryKey: keys.lookups(), queryFn: () => service.getLookups() })
export const useProductTypes = (
  query: TaxonomyListQuery = { page: 1, pageSize: 100 }
) =>
  useQuery({
    queryKey: [...keys.taxonomy("types"), query],
    queryFn: () => service.listProductTypes(query),
    placeholderData: (previous) => previous,
  })
export const useCategories = (
  query: TaxonomyListQuery = { page: 1, pageSize: 100 }
) =>
  useQuery({
    queryKey: [...keys.taxonomy("categories"), query],
    queryFn: () => service.listCategories(query),
    placeholderData: (previous) => previous,
  })
export const useProducts = (query: ProductListQuery) =>
  useQuery({
    queryKey: keys.productList(query),
    queryFn: ({ signal }) => service.listProducts(query, signal),
    placeholderData: (previous) => previous,
  })
export const useProduct = (id: string) =>
  useQuery({
    queryKey: keys.product(id),
    queryFn: () => service.getProduct(id),
    enabled: Boolean(id),
  })
export const useReadiness = (id: string) =>
  useQuery({
    queryKey: keys.readiness(id),
    queryFn: () => service.getActivationReadiness(id),
    enabled: Boolean(id),
  })
export const useEligibility = (id: string, branchId: string) =>
  useQuery({
    queryKey: keys.eligibility(id, branchId),
    queryFn: () => service.getEligibility(id, branchId),
    enabled: Boolean(id && branchId),
  })
export function useProductMutations() {
  const client = useQueryClient()
  const refresh = (id?: string) => {
    void client.invalidateQueries({ queryKey: keys.products() })
    if (id) void client.invalidateQueries({ queryKey: keys.product(id) })
  }
  return {
    create: useMutation({
      mutationFn: (input: CreateProductCommand) => service.createDraft(input),
      onSuccess: (data) => {
        client.setQueryData(keys.product(data.id), data)
        feedback.success("تم إنشاء مسودة المنتج")
        refresh()
      },
      onError: failed,
    }),
    update: useMutation({
      mutationFn: (input: UpdateProductCommand) => service.updateProduct(input),
      onSuccess: (data) => {
        client.setQueryData(keys.product(data.id), data)
        feedback.success("تم حفظ المنتج")
        refresh(data.id)
      },
      onError: failed,
    }),
    transition: useMutation({
      mutationFn: (input: TransitionProductCommand) =>
        service.transitionProduct(input),
      onSuccess: (data) => {
        feedback.success("تم تحديث حالة المنتج")
        refresh(data.id)
      },
      onError: failed,
    }),
  }
}
export function useProductTypeMutations() {
  const client = useQueryClient()
  const refresh = () => {
    void client.invalidateQueries({ queryKey: keys.taxonomy("types") })
    void client.invalidateQueries({ queryKey: keys.lookups() })
  }
  return {
    create: useMutation({
      mutationFn: (input: ProductTypeInput) => service.createProductType(input),
      onSuccess: refresh,
      onError: failed,
    }),
    update: useMutation({
      mutationFn: ({
        id,
        input,
      }: {
        id: string
        input: ProductTypeInput & { expectedVersion: number }
      }) => service.updateProductType(id, input),
      onSuccess: refresh,
      onError: failed,
    }),
    status: useMutation({
      mutationFn: service.changeProductTypeStatus,
      onSuccess: refresh,
      onError: failed,
    }),
  }
}
export function useCategoryMutations() {
  const client = useQueryClient()
  const refresh = () => {
    void client.invalidateQueries({ queryKey: keys.taxonomy("categories") })
    void client.invalidateQueries({ queryKey: keys.lookups() })
  }
  return {
    create: useMutation({
      mutationFn: (input: CategoryInput) => service.createCategory(input),
      onSuccess: refresh,
      onError: failed,
    }),
    update: useMutation({
      mutationFn: ({
        id,
        input,
      }: {
        id: string
        input: CategoryInput & { expectedVersion: number }
      }) => service.updateCategory(id, input),
      onSuccess: refresh,
      onError: failed,
    }),
    status: useMutation({
      mutationFn: service.changeCategoryStatus,
      onSuccess: refresh,
      onError: failed,
    }),
  }
}
