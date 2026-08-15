import { Injectable } from '@nestjs/common';
import { StudentNotFoundException } from '../../../core/exceptions/students.exceptions';
import type { CallerContext } from '../../../shared/types/caller-context';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import { StudentMapper } from '../mappers/student.mapper';
import { StudentPolicy } from '../students/student.policy';
import { StudentRepository } from '../students/student.repository';
import type { StudentTimelineCategory } from '../types/students.types';
import {
  PRISMA_TO_CATEGORY,
  toPrismaCategory,
} from './student-timeline.service';
import { StudentTimelineRepository } from './student-timeline.repository';

const DEFAULT_LIMIT = 25;

const VALID_CATEGORIES: readonly StudentTimelineCategory[] = [
  'admission-submitted',
  'admission-approved',
  'student-created',
  'enrollment-added',
  'document-uploaded',
  'document-replaced',
  'document-archived',
  'profile-updated',
  'status-changed',
  'financial-event',
  'academic-event',
];

@Injectable()
export class StudentTimelineReadService {
  constructor(
    private readonly repository: StudentTimelineRepository,
    private readonly students: StudentRepository,
    private readonly policy: StudentPolicy,
    private readonly mapper: StudentMapper,
    private readonly profile: OrganizationProfileService,
  ) {}

  async page(
    caller: CallerContext,
    studentId: string,
    query: { limit?: number; cursor?: string; categories?: string[] },
  ) {
    await this.assertVisible(caller, studentId);

    const limit = query.limit ?? DEFAULT_LIMIT;
    const categories = (query.categories ?? [])
      .filter((entry): entry is StudentTimelineCategory =>
        VALID_CATEGORIES.includes(entry as StudentTimelineCategory),
      )
      .map((entry) => toPrismaCategory(entry));

    const rows = await this.repository.page({
      studentId,
      limit,
      ...(this.decodeCursor(query.cursor) !== undefined
        ? { cursorSequence: this.decodeCursor(query.cursor) }
        : {}),
      ...(categories.length ? { categories } : {}),
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    return {
      items: page.map((row) => ({
        id: row.id,
        studentId: row.studentId,
        category: PRISMA_TO_CATEGORY[row.category],
        occurredAt: row.occurredAt.toISOString(),
        sequence: row.sequence,
        actor: this.mapper.actor(row.actorId, row.actorName),
        origin: row.origin,
        ...(row.subjectRef ? { subjectRef: row.subjectRef } : {}),
        summary: row.summary,
      })),
      // Absent rather than null when there is no further page, so a client can
      // simply test for its presence.
      nextCursor: hasMore && last ? this.encodeCursor(last.sequence) : null,
    };
  }

  async statusHistory(caller: CallerContext, studentId: string) {
    await this.assertVisible(caller, studentId);
    const rows = await this.repository.statusHistory(studentId);
    return rows.map((row) => this.mapper.statusChange(row));
  }

  /** Opaque to clients: `{"seq":42}` base64-encoded. */
  private encodeCursor(sequence: number): string {
    return Buffer.from(JSON.stringify({ seq: sequence })).toString('base64url');
  }

  private decodeCursor(cursor?: string): number | undefined {
    if (!cursor) return undefined;
    try {
      const parsed: unknown = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      );
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'seq' in parsed &&
        typeof parsed.seq === 'number'
      )
        return (parsed as { seq: number }).seq;
    } catch {
      // A malformed cursor restarts from the newest page rather than failing
      // the read — the timeline is a display surface, not a write path.
    }
    return undefined;
  }

  private async assertVisible(caller: CallerContext, studentId: string) {
    const organizationId = (await this.profile.get()).organizationId;
    const student = await this.students.findById(studentId, organizationId);
    if (!student) throw new StudentNotFoundException();
    this.policy.assertInScope(caller, student);
    return student;
  }
}
