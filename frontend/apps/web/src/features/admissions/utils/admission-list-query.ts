import type { AdmissionListQuery } from "../types/commands"
import { normalizeArabicText } from "./applicant-rules"

export const defaultAdmissionListQuery: AdmissionListQuery = {
  page: 1,
  pageSize: 10,
  status: "all",
  sort: "updatedAt",
  direction: "desc",
}

export const normalizeAdmissionSearch = (value = "") =>
  normalizeArabicText(value)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()

export function normalizeAdmissionListQuery(
  query: AdmissionListQuery
): AdmissionListQuery {
  return {
    ...query,
    search: normalizeAdmissionSearch(query.search),
    page: Math.max(1, Math.trunc(query.page || 1)),
    pageSize: Math.min(100, Math.max(5, Math.trunc(query.pageSize || 10))),
    sort: query.sort ?? "updatedAt",
    direction: query.direction ?? "desc",
  }
}
