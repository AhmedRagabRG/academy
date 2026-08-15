import type { BatchListQuery } from "../types/commands"
export const defaultBatchQuery: BatchListQuery = {
  page: 1,
  pageSize: 10,
  status: "all",
  sort: "updatedAt",
  direction: "desc",
}
export const batchQueryString = (q: BatchListQuery) =>
  new URLSearchParams(
    Object.entries(q)
      .filter(([, v]) => v !== undefined && v !== "" && v !== "all")
      .map(([k, v]) => [k, String(v)])
  ).toString()
