import type { ProductListQuery } from "../types/common"
export const catalogKeys = {
  all: ["academic-catalog"] as const,
  lookups: () => [...catalogKeys.all, "lookups"] as const,
  products: () => [...catalogKeys.all, "products"] as const,
  productList: (query: ProductListQuery) =>
    [...catalogKeys.products(), "list", query] as const,
  product: (id: string) => [...catalogKeys.products(), "detail", id] as const,
  readiness: (id: string) => [...catalogKeys.product(id), "readiness"] as const,
  eligibility: (id: string, branchId: string) =>
    [...catalogKeys.product(id), "eligibility", branchId] as const,
  taxonomy: (kind: "types" | "categories") =>
    [...catalogKeys.all, kind] as const,
}
