import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class StudentNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Archived notes are retained and still returned — nothing is ever deleted. */
  listForStudent(studentId: string) {
    return this.prisma.studentNote.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(noteId: string, studentId: string) {
    return this.prisma.studentNote.findFirst({
      where: { id: noteId, studentId },
    });
  }

  create(data: Prisma.StudentNoteUncheckedCreateInput) {
    return this.prisma.studentNote.create({ data });
  }

  edit(
    noteId: string,
    data: { content: string; editedById: string; editedByName: string },
  ) {
    return this.prisma.studentNote.update({
      where: { id: noteId },
      data: { ...data, editedAt: new Date() },
    });
  }

  archive(noteId: string) {
    return this.prisma.studentNote.update({
      where: { id: noteId },
      data: { archivedAt: new Date() },
    });
  }
}
