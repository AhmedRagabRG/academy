import { Injectable } from '@nestjs/common';
import {
  StudentFileTooLargeException,
  StudentFileUnreadableException,
  StudentUnsupportedFileTypeException,
} from '../../../core/exceptions/students.exceptions';
import type {
  StudentDocumentCompletion,
  StudentDocumentType,
} from '../types/students.types';

const PDF = 'application/pdf';
const JPEG = 'image/jpeg';
const PNG = 'image/png';
const MB = 1024 * 1024;

/**
 * Students publishes its own document type table (research.md R-009). It is
 * deliberately NOT the Admissions policy snapshot: the two modules differ in
 * required flags, limits and states, and Students has no verification workflow.
 * The API enforces exactly the limits it publishes through /students/lookups.
 */
export const STUDENT_DOCUMENT_TYPES: readonly StudentDocumentType[] =
  Object.freeze([
    {
      key: 'personal-photo',
      label: 'الصورة الشخصية',
      required: true,
      multiple: false,
      allowedMimeTypes: [JPEG, PNG],
      maxBytes: 2 * MB,
    },
    {
      key: 'national-id',
      label: 'بطاقة الرقم القومي',
      required: true,
      multiple: false,
      allowedMimeTypes: [PDF, JPEG, PNG],
      maxBytes: 5 * MB,
    },
    {
      key: 'parent-national-id',
      label: 'بطاقة ولي الأمر',
      required: false,
      multiple: false,
      allowedMimeTypes: [PDF, JPEG, PNG],
      maxBytes: 5 * MB,
    },
    {
      key: 'birth-certificate',
      label: 'شهادة الميلاد',
      required: true,
      multiple: false,
      allowedMimeTypes: [PDF, JPEG, PNG],
      maxBytes: 5 * MB,
    },
    {
      key: 'qualification-certificate',
      label: 'شهادة المؤهل',
      required: true,
      multiple: false,
      allowedMimeTypes: [PDF, JPEG, PNG],
      maxBytes: 5 * MB,
    },
    {
      key: 'admission-declaration',
      label: 'إقرار القبول',
      required: true,
      multiple: false,
      allowedMimeTypes: [PDF],
      maxBytes: 5 * MB,
    },
    {
      key: 'additional-attachment',
      label: 'مرفق إضافي',
      required: false,
      multiple: true,
      allowedMimeTypes: [PDF, JPEG, PNG],
      maxBytes: 10 * MB,
    },
  ]);

/** The largest limit any type allows — the multipart interceptor ceiling. */
export const STUDENT_DOCUMENT_MAX_BYTES = STUDENT_DOCUMENT_TYPES.reduce(
  (max, type) => Math.max(max, type.maxBytes),
  0,
);

/**
 * Admission requirement keys mapped to student document type keys. A key with
 * no student equivalent is skipped at intake rather than silently creating an
 * unpublished type (research.md R-009).
 */
const ADMISSION_KEY_MAP: Readonly<Record<string, string>> = Object.freeze({
  'personal-photo': 'personal-photo',
  'national-id': 'national-id',
  'parent-national-id': 'parent-national-id',
  'birth-certificate': 'birth-certificate',
  'qualification-certificate': 'qualification-certificate',
  declaration: 'admission-declaration',
  'admission-declaration': 'admission-declaration',
  'additional-attachment': 'additional-attachment',
});

@Injectable()
export class StudentDocumentPolicy {
  types(): readonly StudentDocumentType[] {
    return STUDENT_DOCUMENT_TYPES;
  }

  find(typeKey: string): StudentDocumentType | null {
    return STUDENT_DOCUMENT_TYPES.find((type) => type.key === typeKey) ?? null;
  }

  mapAdmissionRequirementKey(requirementKey: string): string | null {
    return ADMISSION_KEY_MAP[requirementKey] ?? null;
  }

  /**
   * Server-side re-validation, run regardless of any client check. The three
   * failures stay distinguishable: an empty file is `file-unreadable` (and
   * retryable), not a type or size error.
   */
  assertFileAcceptable(
    type: StudentDocumentType,
    file: { mimetype: string; size: number; buffer?: Buffer },
  ): void {
    if (file.size <= 0 || (file.buffer && file.buffer.length === 0))
      throw new StudentFileUnreadableException();
    if (!type.allowedMimeTypes.includes(file.mimetype))
      throw new StudentUnsupportedFileTypeException(type.allowedMimeTypes);
    if (file.size > type.maxBytes)
      throw new StudentFileTooLargeException(type.maxBytes);
  }

  /**
   * Required types first, then alphabetical by Arabic label, so missing
   * evidence surfaces at the top (FR-035).
   */
  sortKey(typeKey: string): [number, string] {
    const type = this.find(typeKey);
    if (!type) return [2, typeKey];
    return [type.required ? 0 : 1, type.label];
  }

  compare(a: string, b: string): number {
    const [aRank, aLabel] = this.sortKey(a);
    const [bRank, bLabel] = this.sortKey(b);
    if (aRank !== bRank) return aRank - bRank;
    return aLabel.localeCompare(bLabel, 'ar');
  }

  /**
   * Server-computed completion (FR-036). A required type with no present
   * document counts as missing; archived documents never count as present.
   */
  completion(
    documents: readonly { typeKey: string; state: string }[],
  ): StudentDocumentCompletion {
    const requiredTypes = STUDENT_DOCUMENT_TYPES.filter(
      (type) => type.required,
    );
    const present = documents.filter((doc) => doc.state === 'PRESENT');
    const archived = documents.filter((doc) => doc.state === 'ARCHIVED');
    const satisfied = requiredTypes.filter((type) =>
      present.some((doc) => doc.typeKey === type.key),
    );
    return {
      requiredTypes: requiredTypes.length,
      present: present.length,
      missing: requiredTypes.length - satisfied.length,
      archived: archived.length,
    };
  }
}
