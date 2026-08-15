export type StudentStatus =
  'active' | 'suspended' | 'graduated' | 'withdrawn' | 'archived';

export type StudentEnrollmentStatus =
  'active' | 'completed' | 'suspended' | 'withdrawn';

export type StudentOfferingKind =
  'professional-program' | 'professional-diploma' | 'training-course';

/** Differs from Admissions deliberately: Students has no verification state. */
export type StudentDocumentState = 'missing' | 'present' | 'archived';

export type StudentTimelineCategory =
  | 'admission-submitted'
  | 'admission-approved'
  | 'student-created'
  | 'enrollment-added'
  | 'document-uploaded'
  | 'document-replaced'
  | 'document-archived'
  | 'profile-updated'
  | 'status-changed'
  | 'financial-event'
  | 'academic-event';

export type StudentTimelineOrigin =
  'admissions' | 'students' | 'finance' | 'academic';

export interface ActorRef {
  id: string;
  name: string;
  active: boolean;
}

export interface StudentIdentityRules {
  nationalIdPattern: string;
  phonePattern: string;
  minorAgeThreshold: number;
  minimumGraduationAge: number;
}

export interface StudentDocumentType {
  key: string;
  label: string;
  required: boolean;
  multiple: boolean;
  allowedMimeTypes: readonly string[];
  maxBytes: number;
}

export interface StudentDocumentCompletion {
  requiredTypes: number;
  present: number;
  missing: number;
  archived: number;
}

/**
 * Operational eligibility is deliberately NOT stored. Consumers derive it as
 * `status === 'active' && documentCompletion.missing === 0`. See research.md R-006.
 */
export const STUDENT_PERMISSION_KEYS = [
  'students.view',
  'students.update',
  'students.archive',
  'students.activate',
  'students.status.manage',
  'students.status.correct',
  'students.export',
  'students.enrollments.view',
  'students.documents.view',
  'students.documents.manage',
  'students.notes.view',
  'students.notes.manage',
  'students.timeline.view',
  'students.finance.view',
  'students.intake',
] as const;

export type StudentPermissionKey = (typeof STUDENT_PERMISSION_KEYS)[number];

/** The per-record flag names the detail response exposes. */
export interface StudentRecordPermissions {
  overview: boolean;
  enrollments: boolean;
  documents: boolean;
  documentsManage: boolean;
  notes: boolean;
  notesManage: boolean;
  timeline: boolean;
  financial: boolean;
  update: boolean;
  archive: boolean;
  activate: boolean;
  statusManage: boolean;
  statusCorrect: boolean;
  export: boolean;
}
