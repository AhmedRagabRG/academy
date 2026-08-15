import type {
  AttachmentPolicy,
  NumberingPolicy,
} from "../types/domain"

/**
 * Service-supplied configuration.
 *
 * Every value here is business data an administrator could change, not an
 * application rule. Nothing in the module's code or components repeats any of it
 * (constitution III, spec FR-011/FR-017/FR-018).
 */

export const ORGANIZATION_ID = "organization-alsalam"
export const CURRENCY = "EGP"
export const PRECISION = 2

export const numberingPolicy: NumberingPolicy = {
  prefix: "EXP",
  yearSegment: "2026",
  padding: 5,
}

export const attachmentPolicy: AttachmentPolicy = {
  acceptedMimeTypes: [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
  ],
  maxBytes: 5 * 1024 * 1024,
}

/** The accepted extensions, derived from the policy rather than repeated. */
export const acceptedExtensions = [".pdf", ".jpg", ".jpeg", ".png"]

export function accountingConfiguration() {
  return {
    numbering: numberingPolicy,
    attachments: attachmentPolicy,
    currency: CURRENCY,
    precision: PRECISION,
  }
}
