import type { AdmissionDocument, DocumentRequirement } from "../types/domain"
import type { DocumentFileInput } from "../types/commands"

export function validateAdmissionFile(
  file: DocumentFileInput,
  requirement: DocumentRequirement
) {
  if (!requirement.allowedMimeTypes.includes(file.type))
    return "document-type-invalid"
  if (file.size <= 0) return "document-empty"
  if (file.size > requirement.maxBytes) return "document-too-large"
  return undefined
}

export function currentDocumentState(document: AdmissionDocument) {
  const version = document.currentVersion
  if (!version) return "missing" as const
  if (version.status === "withdrawn") return "withdrawn" as const
  const decision = [...document.decisions]
    .reverse()
    .find((item) => item.documentVersionId === version.id)
  return decision?.decision ?? ("pending" as const)
}

export function documentCompletion(documents: AdmissionDocument[]) {
  const required = documents.filter((item) => item.requirement.required)
  return {
    required: required.length,
    missing: required.filter((item) => item.state === "missing").length,
    pending: required.filter((item) => item.state === "pending").length,
    rejected: required.filter((item) => item.state === "rejected").length,
    verified: required.filter((item) => item.state === "verified").length,
  }
}
