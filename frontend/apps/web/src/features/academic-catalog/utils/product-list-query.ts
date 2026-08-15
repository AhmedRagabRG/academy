import type { ProductListQuery } from "../types/common"
export const defaultProductQuery: ProductListQuery = {
  page: 1,
  pageSize: 10,
  sort: "updatedAt",
  direction: "desc",
}
export function parseProductQuery(params: URLSearchParams): ProductListQuery {
  const list = (key: string) => params.getAll(key).filter(Boolean)
  return {
    search: params.get("search") ?? "",
    typeIds: list("type"),
    categoryIds: list("category"),
    departmentIds: list("department"),
    branchIds: list("branch"),
    statuses: list("status") as ProductListQuery["statuses"],
    sort: (params.get("sort") as ProductListQuery["sort"]) ?? "updatedAt",
    direction: params.get("direction") === "asc" ? "asc" : "desc",
    page: Math.max(1, Number(params.get("page")) || 1),
    pageSize: Math.min(100, Math.max(5, Number(params.get("pageSize")) || 10)),
  }
}
export function serializeProductQuery(query: ProductListQuery) {
  const params = new URLSearchParams()
  if (query.search) params.set("search", query.search.trim())
  for (const [key, values] of [
    ["type", query.typeIds],
    ["category", query.categoryIds],
    ["department", query.departmentIds],
    ["branch", query.branchIds],
    ["status", query.statuses],
  ] as const)
    values?.forEach((value) => params.append(key, value))
  params.set("sort", query.sort ?? "updatedAt")
  params.set("direction", query.direction ?? "desc")
  params.set("page", String(query.page))
  params.set("pageSize", String(query.pageSize))
  return params.toString()
}
