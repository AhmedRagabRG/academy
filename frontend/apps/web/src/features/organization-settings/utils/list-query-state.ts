import type { ListQuery } from "../types/common"

export const defaultListQuery: ListQuery = { search: "", status: "all", page: 1, pageSize: 10, sort: "updatedAt", direction: "desc" }

export function parseListQuery(params: URLSearchParams): ListQuery {
  const page = Number(params.get("page"))
  const pageSize = Number(params.get("pageSize"))
  const status = params.get("status")
  return {
    ...defaultListQuery,
    search: params.get("search") ?? "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: [10, 20, 50].includes(pageSize) ? pageSize : 10,
    status: status === "active" || status === "inactive" || status === "archived" ? status : "all",
  }
}

export function serializeListQuery(query: ListQuery) {
  const params = new URLSearchParams()
  if (query.search) params.set("search", query.search)
  if (query.status && query.status !== "all") params.set("status", query.status)
  if (query.page > 1) params.set("page", String(query.page))
  if (query.pageSize !== 10) params.set("pageSize", String(query.pageSize))
  return params.toString()
}
