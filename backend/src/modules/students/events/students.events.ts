import type { DomainEvent } from '../../../core/events/domain-event.bus';

export const STUDENT_EVENT_NAMES = {
  created: 'student.created',
  admissionConverted: 'student.admission-converted',
  profileUpdated: 'student.profile-updated',
  guardianUpdated: 'student.guardian-updated',
  statusChanged: 'student.status-changed',
  archived: 'student.archived',
  documentUploaded: 'student.document-uploaded',
  documentReplaced: 'student.document-replaced',
  documentArchived: 'student.document-archived',
  noteAdded: 'student.note-added',
  noteUpdated: 'student.note-updated',
} as const;

export type StudentEventName =
  (typeof STUDENT_EVENT_NAMES)[keyof typeof STUDENT_EVENT_NAMES];

/**
 * Audit-ready events emitted after the transaction commits. Persisting them
 * later must require only a new subscriber, never a change to business logic
 * (constitution Principle X).
 */
export function studentEvent(
  name: StudentEventName,
  input: {
    actorId: string | null;
    studentId: string;
    operation: string;
    payload?: Record<string, unknown>;
  },
): DomainEvent {
  return {
    name,
    occurredAt: new Date().toISOString(),
    actor: input.actorId ? { accountId: input.actorId } : null,
    target: { type: 'student', id: input.studentId },
    operation: input.operation,
    payload: input.payload ?? {},
  };
}
