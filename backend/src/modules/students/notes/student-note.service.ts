import { Inject, Injectable } from '@nestjs/common';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import {
  StudentNoteContentEmptyException,
  StudentNotFoundException,
} from '../../../core/exceptions/students.exceptions';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  IAM_EMPLOYEE_REFERENCE_PORT,
  type EmployeeReferencePort,
} from '../../identity/types/employee-reference.port';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import { STUDENT_EVENT_NAMES, studentEvent } from '../events/students.events';
import { StudentMapper, type ActiveLookup } from '../mappers/student.mapper';
import { StudentPolicy } from '../students/student.policy';
import { StudentRepository } from '../students/student.repository';
import type { WriteStudentNoteDto } from './dto/student-note.dto';
import { StudentNoteRepository } from './student-note.repository';

@Injectable()
export class StudentNoteService {
  constructor(
    private readonly repository: StudentNoteRepository,
    private readonly students: StudentRepository,
    private readonly policy: StudentPolicy,
    private readonly mapper: StudentMapper,
    private readonly profile: OrganizationProfileService,
    private readonly events: DomainEventBus,
    @Inject(IAM_EMPLOYEE_REFERENCE_PORT)
    private readonly employees: EmployeeReferencePort,
  ) {}

  async list(caller: CallerContext, studentId: string) {
    const organizationId = await this.loadStudent(caller, studentId);
    const rows = await this.repository.listForStudent(studentId);
    const isActive = await this.actorLookup(
      organizationId,
      rows.flatMap((row) => [row.authorId, row.editedById ?? row.authorId]),
    );
    return rows.map((row) => this.mapper.note(row, isActive));
  }

  async create(
    caller: CallerContext,
    studentId: string,
    dto: WriteStudentNoteDto,
  ) {
    await this.loadStudent(caller, studentId);
    const content = this.assertContent(dto.content);

    const note = await this.repository.create({
      studentId,
      content,
      authorId: caller.accountId,
      authorName: caller.displayName || 'موظف',
    });

    this.events.emit(
      studentEvent(STUDENT_EVENT_NAMES.noteAdded, {
        actorId: caller.accountId,
        studentId,
        operation: 'note-added',
        payload: { noteId: note.id },
      }),
    );

    return this.mapper.note(note);
  }

  async edit(
    caller: CallerContext,
    studentId: string,
    noteId: string,
    dto: WriteStudentNoteDto,
  ) {
    await this.loadStudent(caller, studentId);
    const existing = await this.repository.findById(noteId, studentId);
    if (!existing) throw new StudentNotFoundException();
    const content = this.assertContent(dto.content);

    const note = await this.repository.edit(noteId, {
      content,
      editedById: caller.accountId,
      editedByName: caller.displayName || 'موظف',
    });

    this.events.emit(
      studentEvent(STUDENT_EVENT_NAMES.noteUpdated, {
        actorId: caller.accountId,
        studentId,
        operation: 'note-updated',
        payload: { noteId },
      }),
    );

    return this.mapper.note(note);
  }

  async archive(caller: CallerContext, studentId: string, noteId: string) {
    await this.loadStudent(caller, studentId);
    const existing = await this.repository.findById(noteId, studentId);
    if (!existing) throw new StudentNotFoundException();
    const note = await this.repository.archive(noteId);

    this.events.emit(
      studentEvent(STUDENT_EVENT_NAMES.noteUpdated, {
        actorId: caller.accountId,
        studentId,
        operation: 'note-archived',
        payload: { noteId },
      }),
    );

    return this.mapper.note(note);
  }

  /** Whitespace-only content is refused, not silently stored (FR-047). */
  private assertContent(raw: string): string {
    const content = (raw ?? '').trim();
    if (!content) throw new StudentNoteContentEmptyException();
    return content;
  }

  private async loadStudent(
    caller: CallerContext,
    studentId: string,
  ): Promise<string> {
    const organizationId = (await this.profile.get()).organizationId;
    const student = await this.students.findById(studentId, organizationId);
    if (!student) throw new StudentNotFoundException();
    this.policy.assertInScope(caller, student);
    return organizationId;
  }

  private async actorLookup(
    organizationId: string,
    ids: readonly string[],
  ): Promise<ActiveLookup> {
    const unique = [...new Set(ids.filter(Boolean))];
    const resolved = await Promise.all(
      unique.map((id) =>
        this.employees
          .resolve(id, organizationId)
          .then((row) => [id, Boolean(row?.active)] as const)
          .catch(() => [id, false] as const),
      ),
    );
    const map = new Map(resolved);
    return (id: string) => map.get(id) ?? true;
  }
}
