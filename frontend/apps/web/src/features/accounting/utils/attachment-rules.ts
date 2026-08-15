import type { AttachmentPolicy } from "../types/domain"

/**
 * Attachment validation, read from the configured policy rather than from
 * constants in a component (spec FR-017, FR-018).
 */
export type AttachmentRefusal =
  | { ok: true }
  | { ok: false; code: "attachment-type-rejected"; acceptedTypes: string }
  | { ok: false; code: "attachment-too-large"; limit: string }

export function validateAttachment(
  file: { mimeType: string; sizeBytes: number },
  policy: AttachmentPolicy
): AttachmentRefusal {
  const mimeType = file.mimeType.trim().toLowerCase()
  if (!policy.acceptedMimeTypes.includes(mimeType))
    return {
      ok: false,
      code: "attachment-type-rejected",
      acceptedTypes: policy.acceptedMimeTypes.join("، "),
    }

  // An empty file passes a type check and carries nothing. Refusing it here beats
  // discovering it when someone opens the invoice during an audit.
  if (file.sizeBytes <= 0)
    return { ok: false, code: "attachment-too-large", limit: formatBytes(policy.maxBytes) }

  if (file.sizeBytes > policy.maxBytes)
    return {
      ok: false,
      code: "attachment-too-large",
      limit: formatBytes(policy.maxBytes),
    }

  return { ok: true }
}

const UNITS = ["بايت", "ك.ب", "م.ب", "ج.ب"]

/** Human-readable size. The figure itself stays direction-isolated in the UI. */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return `0 ${UNITS[0]}`
  const exponent = Math.min(
    UNITS.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  )
  const value = bytes / 1024 ** exponent
  const rounded = exponent === 0 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${UNITS[exponent]}`
}

/** The `accept` map for the shared dropzone, derived from the policy. */
export function dropzoneAccept(policy: AttachmentPolicy): Record<string, string[]> {
  // A MIME-to-extension translation, not business configuration — which types are
  // *accepted* comes from the policy and is filtered against this below.
  const extensions: Record<string, string[]> = {
    "application/pdf": [".pdf"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/jpg": [".jpg", ".jpeg"],
    "image/png": [".png"],
  }
  return Object.fromEntries(
    policy.acceptedMimeTypes
      .filter((type) => type in extensions)
      .map((type) => [type, extensions[type]!])
  )
}
