export const ADMISSION_DOCUMENT_DEFAULT_MAX_BYTES = 5_000_000;
export const ADMISSION_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type AdmissionDocumentMimeType =
  (typeof ADMISSION_DOCUMENT_MIME_TYPES)[number];
export type AdmissionDocumentState =
  'missing' | 'uploading' | 'pending' | 'verified' | 'rejected' | 'withdrawn';
export type AdmissionDocumentVersionStatus =
  'available' | 'failed' | 'withdrawn';
export type AdmissionDocumentDecisionValue = 'verified' | 'rejected';

export interface DocumentRequirementRule {
  id: string;
  stableKey: string;
  required: boolean;
  allowedMimeTypes: readonly string[];
  maximumBytes: number;
}

export interface DocumentVersionEvidence {
  id: string;
  status: AdmissionDocumentVersionStatus;
  mimeType: string;
  byteSize: number;
  versionNumber: number;
}

export interface DocumentDecisionEvidence {
  decision: AdmissionDocumentDecisionValue;
  reason?: string | null;
  decidedAt: Date;
}

export function validateRequirementFile(
  requirement: DocumentRequirementRule,
  file: { mimeType: string; size: number },
): 'unsupported-type' | 'file-too-large' | null {
  const limit = Math.min(
    requirement.maximumBytes,
    ADMISSION_DOCUMENT_DEFAULT_MAX_BYTES,
  );
  if (!requirement.allowedMimeTypes.includes(file.mimeType))
    return 'unsupported-type';
  if (file.size > limit) return 'file-too-large';
  return null;
}

export function deriveAdmissionDocumentState(input: {
  currentVersion?: DocumentVersionEvidence | null;
  latestDecision?: DocumentDecisionEvidence | null;
  uploading?: boolean;
}): AdmissionDocumentState {
  if (input.uploading) return 'uploading';
  if (!input.currentVersion) return 'missing';
  if (input.currentVersion.status === 'withdrawn') return 'withdrawn';
  if (input.currentVersion.status === 'failed') return 'missing';
  if (input.latestDecision?.decision === 'verified') return 'verified';
  if (input.latestDecision?.decision === 'rejected') return 'rejected';
  return 'pending';
}

export function validateDocumentDecision(
  decision: AdmissionDocumentDecisionValue,
  reason?: string | null,
): boolean {
  return decision !== 'rejected' || Boolean(reason?.trim());
}

export function selectCurrentVersion(
  versions: readonly DocumentVersionEvidence[],
): DocumentVersionEvidence | null {
  return (
    versions
      .filter((version) => version.status === 'available')
      .sort((left, right) => right.versionNumber - left.versionNumber)[0] ??
    null
  );
}

export interface PolicyRequirementReconciliation {
  retainedKeys: string[];
  addedKeys: string[];
  retiredKeys: string[];
}

export function reconcileRequirementKeys(
  existingKeys: readonly string[],
  nextKeys: readonly string[],
): PolicyRequirementReconciliation {
  const existing = new Set(existingKeys);
  const next = new Set(nextKeys);
  return {
    retainedKeys: [...next].filter((key) => existing.has(key)),
    addedKeys: [...next].filter((key) => !existing.has(key)),
    retiredKeys: [...existing].filter((key) => !next.has(key)),
  };
}
