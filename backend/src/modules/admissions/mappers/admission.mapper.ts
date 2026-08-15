import { fromMinorUnits } from '../../../shared/utils/money.util';
import type {
  AdmissionListProjection,
  AdmissionPermissions,
  AdmissionTimelineProjection,
  SafeTimelineMetadata,
  SafeTimelineMetadataValue,
} from '../types/admissions.types';

const SAFE_METADATA_KEYS = new Set([
  'applicantId',
  'offeringId',
  'batchId',
  'documentId',
  'documentVersionId',
  'requirementId',
  'requirementKey',
  'selectionRevisionId',
  'financialRevisionId',
  'policySnapshotId',
  'approvalSnapshotId',
  'fromStatus',
  'toStatus',
  'changedSection',
  'changedField',
  'reasonCode',
  'decision',
  'revisionNumber',
]);

export function maskAdmissionPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  const visible = digits.slice(-4);
  return visible
    ? `${'*'.repeat(Math.max(0, digits.length - 4))}${visible}`
    : '';
}

export function serializeAdmissionMoney(
  minorUnits: bigint | number | string,
  currency: string,
  precision: number,
) {
  return fromMinorUnits(BigInt(minorUnits), currency, precision);
}

export function safeTimelineMetadata(
  value: Readonly<Record<string, unknown>> | null | undefined,
): SafeTimelineMetadata {
  if (!value) return Object.freeze({});
  const safe: Record<string, SafeTimelineMetadataValue> = {};
  for (const [key, candidate] of Object.entries(value)) {
    if (!SAFE_METADATA_KEYS.has(key)) continue;
    if (
      candidate === null ||
      typeof candidate === 'string' ||
      typeof candidate === 'number' ||
      typeof candidate === 'boolean'
    )
      safe[key] = candidate;
  }
  return Object.freeze(safe);
}

export function mapAdmissionListItem(
  row: AdmissionListProjection,
): Omit<AdmissionListProjection, 'primaryPhone'> & { primaryPhone: string } {
  return { ...row, primaryPhone: maskAdmissionPhone(row.primaryPhone) };
}

export function mapAdmissionTimeline(
  row: Omit<AdmissionTimelineProjection, 'metadata'> & {
    metadata: Readonly<Record<string, unknown>> | null;
  },
): AdmissionTimelineProjection {
  return { ...row, metadata: safeTimelineMetadata(row.metadata) };
}

export interface AdmissionDetailSections {
  financial?: unknown;
  documents?: unknown;
  [key: string]: unknown;
}

export function filterAdmissionDetailSections<
  T extends AdmissionDetailSections,
>(
  detail: T,
  permissions: AdmissionPermissions,
): Omit<T, 'financial' | 'documents'> & {
  financial?: unknown;
  documents?: unknown;
  permissions: AdmissionPermissions;
} {
  const { financial, documents, ...publicDetail } = detail;
  return {
    ...publicDetail,
    ...(permissions.viewFinancials ? { financial } : {}),
    ...(permissions.viewDocuments ? { documents } : {}),
    permissions,
  };
}
