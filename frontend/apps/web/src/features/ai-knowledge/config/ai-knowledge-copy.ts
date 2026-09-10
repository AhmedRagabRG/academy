import type { KnowledgeSourceStatus } from "../types/domain"

export const sourceStatusLabels: Record<KnowledgeSourceStatus, string> = {
  pending: "قيد الانتظار",
  processing: "قيد المعالجة",
  ready: "جاهز",
  failed: "فشل",
}

export const sourceStatusTones: Record<
  KnowledgeSourceStatus,
  "success" | "warning" | "danger" | "neutral"
> = {
  pending: "neutral",
  processing: "warning",
  ready: "success",
  failed: "danger",
}

export const visibilityLabels = {
  "customer-facing": "متاح للعملاء",
  internal: "داخلي فقط",
} as const

export const kindLabels = { file: "ملف", text: "نص" } as const

/** react-dropzone's Accept map. Mirrors the backend's knowledge-source purpose. */
export const acceptedSourceTypes = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
} as const
export const maxSourceBytes = 20 * 1024 * 1024
