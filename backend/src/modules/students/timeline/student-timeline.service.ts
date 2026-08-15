import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  StudentTimelineCategory as PrismaTimelineCategory,
} from '../../../../prisma/generated/client';
import { StudentRepository } from '../students/student.repository';
import type {
  StudentTimelineCategory,
  StudentTimelineOrigin,
} from '../types/students.types';

export interface AppendTimelineEventInput {
  studentId: string;
  category: StudentTimelineCategory;
  actorId: string;
  actorName: string;
  origin: StudentTimelineOrigin;
  summary: string;
  subjectRef?: string;
  occurredAt?: Date;
}

const CATEGORY_TO_PRISMA: Readonly<
  Record<StudentTimelineCategory, PrismaTimelineCategory>
> = Object.freeze({
  'admission-submitted': 'ADMISSION_SUBMITTED',
  'admission-approved': 'ADMISSION_APPROVED',
  'student-created': 'STUDENT_CREATED',
  'enrollment-added': 'ENROLLMENT_ADDED',
  'document-uploaded': 'DOCUMENT_UPLOADED',
  'document-replaced': 'DOCUMENT_REPLACED',
  'document-archived': 'DOCUMENT_ARCHIVED',
  'profile-updated': 'PROFILE_UPDATED',
  'status-changed': 'STATUS_CHANGED',
  'financial-event': 'FINANCIAL_EVENT',
  'academic-event': 'ACADEMIC_EVENT',
});

export const PRISMA_TO_CATEGORY: Readonly<
  Record<PrismaTimelineCategory, StudentTimelineCategory>
> = Object.freeze(
  Object.fromEntries(
    Object.entries(CATEGORY_TO_PRISMA).map(([key, value]) => [value, key]),
  ) as Record<PrismaTimelineCategory, StudentTimelineCategory>,
);

export function toPrismaCategory(
  category: StudentTimelineCategory,
): PrismaTimelineCategory {
  return CATEGORY_TO_PRISMA[category];
}

/**
 * Append-only timeline writer.
 *
 * `sequence` comes from a per-student counter incremented in the same
 * transaction as the insert, so events sharing a millisecond still order
 * deterministically and the cursor never duplicates or skips a row
 * (research.md R-005).
 */
@Injectable()
export class StudentTimelineService {
  constructor(private readonly students: StudentRepository) {}

  async append(
    input: AppendTimelineEventInput,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const sequence = await this.students.nextTimelineSequence(
      input.studentId,
      tx,
    );
    await tx.studentTimelineEvent.create({
      data: {
        studentId: input.studentId,
        category: toPrismaCategory(input.category),
        occurredAt: input.occurredAt ?? new Date(),
        sequence,
        actorId: input.actorId,
        actorName: input.actorName,
        origin: input.origin,
        summary: input.summary,
        ...(input.subjectRef ? { subjectRef: input.subjectRef } : {}),
      },
    });
  }

  /** Appends several events in order, sharing one transaction. */
  async appendAll(
    events: readonly AppendTimelineEventInput[],
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    for (const event of events) {
      await this.append(event, tx);
    }
  }
}
