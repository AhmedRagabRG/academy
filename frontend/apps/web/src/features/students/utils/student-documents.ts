import type { StudentDocumentVersionId } from "../types/common"
import type {
  StudentDocument,
  StudentDocumentType,
  StudentDocumentVersion,
} from "../types/domain"
import type { StudentDocumentCompletion } from "../types/projections"

export function currentVersion(
  document: StudentDocument
): StudentDocumentVersion | undefined {
  if (!document.currentVersionId) return undefined
  return document.versions.find(
    (version) => version.id === document.currentVersionId
  )
}

/** Newest version first for the history view. */
export function versionHistory(
  document: StudentDocument
): StudentDocumentVersion[] {
  return [...document.versions].sort(
    (left, right) => right.versionNumber - left.versionNumber
  )
}

export function nextVersionNumber(document: StudentDocument): number {
  return document.versions.reduce(
    (highest, version) => Math.max(highest, version.versionNumber),
    0
  ) + 1
}

/**
 * A retried upload carrying the same attempt id resolves to the version already
 * stored, so an interrupted upload never produces a duplicate (spec US6-7).
 */
export function findByUploadAttempt(
  document: StudentDocument,
  uploadAttemptId: string
): StudentDocumentVersion | undefined {
  return document.versions.find(
    (version) => version.uploadAttemptId === uploadAttemptId
  )
}

export type FileRejection =
  | "unsupported-file-type"
  | "file-too-large"
  | "file-unreadable"

export function validateFileAgainstType(
  file: { name: string; type: string; size: number },
  type: StudentDocumentType
): FileRejection | undefined {
  if (file.size <= 0) return "file-unreadable"
  if (!type.allowedMimeTypes.includes(file.type)) return "unsupported-file-type"
  if (file.size > type.maxBytes) return "file-too-large"
  return undefined
}

export function isArchived(document: StudentDocument): boolean {
  return document.state === "archived"
}

/** Archive never removes versions; it only leaves the active set (spec FR-019). */
export function archivedDocument(
  document: StudentDocument,
  archivedAt: string,
  archivedBy: StudentDocument["archivedBy"],
  reason?: string
): StudentDocument {
  return {
    ...document,
    state: "archived",
    archivedAt,
    archivedBy,
    archiveReason: reason,
  }
}

export function documentCompletion(
  documents: readonly StudentDocument[]
): StudentDocumentCompletion {
  const required = documents.filter((document) => document.type.required)
  return {
    requiredTypes: required.length,
    present: required.filter((document) => document.state === "present").length,
    missing: required.filter((document) => document.state === "missing").length,
    archived: documents.filter((document) => document.state === "archived")
      .length,
  }
}

/** Required types first, then alphabetical, so missing evidence surfaces early. */
export function sortDocuments(
  documents: readonly StudentDocument[]
): StudentDocument[] {
  return [...documents].sort((left, right) => {
    if (left.type.required !== right.type.required)
      return left.type.required ? -1 : 1
    return left.type.label.localeCompare(right.type.label, "ar")
  })
}

export function withNewVersion(
  document: StudentDocument,
  version: StudentDocumentVersion
): StudentDocument {
  return {
    ...document,
    state: "present",
    currentVersionId: version.id as StudentDocumentVersionId,
    versions: [...document.versions, version],
    archivedAt: undefined,
    archivedBy: undefined,
    archiveReason: undefined,
  }
}
