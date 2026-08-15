import { Injectable } from '@nestjs/common';
import type { StudentTimelineCategory } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class StudentTimelineRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cursor page. Ordering is `(occurredAt DESC, sequence DESC)`; because
   * `sequence` is monotonic per student, filtering on `sequence < cursor` is
   * both correct and index-friendly even when timestamps collide.
   * Takes limit+1 to detect whether another page exists.
   */
  page(input: {
    studentId: string;
    limit: number;
    cursorSequence?: number;
    categories?: StudentTimelineCategory[];
  }) {
    return this.prisma.studentTimelineEvent.findMany({
      where: {
        studentId: input.studentId,
        ...(input.cursorSequence !== undefined
          ? { sequence: { lt: input.cursorSequence } }
          : {}),
        ...(input.categories?.length
          ? { category: { in: input.categories } }
          : {}),
      },
      orderBy: [{ occurredAt: 'desc' }, { sequence: 'desc' }],
      take: input.limit + 1,
    });
  }

  statusHistory(studentId: string) {
    return this.prisma.studentStatusChange.findMany({
      where: { studentId },
      orderBy: { occurredAt: 'asc' },
    });
  }
}
