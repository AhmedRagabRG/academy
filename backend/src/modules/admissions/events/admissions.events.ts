import type {
  AdmissionStatus,
  TimelineEventKind,
} from '../types/admissions.types';

export const ADMISSIONS_EVENT_NAMES = [
  'admissions.created',
  'admissions.applicant-updated',
  'admissions.assignment-changed',
  'admissions.selection-changed',
  'admissions.financial-updated',
  'admissions.document-changed',
  'admissions.status-changed',
  'admissions.archived',
  'admissions.enrolled',
] as const;
export type AdmissionsEventName = (typeof ADMISSIONS_EVENT_NAMES)[number];

interface AdmissionsEventBase {
  admissionId: string;
  organizationId: string;
  actorId: string;
  version: number;
  occurredAt: string;
}

export type AdmissionsEventPayload = AdmissionsEventBase & {
  name: AdmissionsEventName;
  kind: TimelineEventKind;
  changedSections?: readonly string[];
  fromStatus?: AdmissionStatus;
  toStatus?: AdmissionStatus;
  documentId?: string;
};

export function admissionEvent(
  payload: AdmissionsEventPayload,
): AdmissionsEventPayload {
  return Object.freeze({
    ...payload,
    changedSections: payload.changedSections
      ? Object.freeze([...payload.changedSections])
      : undefined,
  });
}
