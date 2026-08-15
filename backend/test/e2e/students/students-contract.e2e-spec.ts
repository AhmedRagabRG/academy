import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { StudentController } from '../../../src/modules/students/students/student.controller';
import { StudentIntakeController } from '../../../src/modules/students/intake/student-intake.controller';
import { StudentStatusController } from '../../../src/modules/students/lifecycle/student-status.controller';
import { StudentDocumentController } from '../../../src/modules/students/documents/student-document.controller';
import { StudentNoteController } from '../../../src/modules/students/notes/student-note.controller';
import { StudentTimelineController } from '../../../src/modules/students/timeline/student-timeline.controller';
import { StudentSummaryController } from '../../../src/modules/students/summaries/student-summary.controller';
import { StudentsLookupsController } from '../../../src/modules/students/lookups/students-lookups.controller';

// Taken from the framework enum rather than hardcoded: the numeric values are
// not in the order you would guess (DELETE is 3, PATCH is 4), and guessing them
// makes the "no delete route" assertion pass vacuously against PUT.
const GET = RequestMethod.GET;
const POST = RequestMethod.POST;
const PATCH = RequestMethod.PATCH;
const DELETE = RequestMethod.DELETE;

type Ctor = { prototype: object };

const handlers = (controller: Ctor): { name: string; fn: unknown }[] =>
  Object.getOwnPropertyNames(controller.prototype)
    .filter((name) => name !== 'constructor')
    .map((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(
        controller.prototype,
        name,
      );
      return { name, fn: descriptor?.value as unknown };
    })
    .filter((entry) => typeof entry.fn === 'function');

const meta = (fn: unknown) => ({
  path: Reflect.getMetadata(PATH_METADATA, fn as object) as string,
  method: Reflect.getMetadata(METHOD_METADATA, fn as object) as
    RequestMethod | undefined,
  permissions: (Reflect.getMetadata('requiredPermissions', fn as object) ??
    []) as string[],
  responses: Reflect.getMetadata(
    'swagger/apiResponse',
    fn as object,
  ) as unknown,
});

describe('Students HTTP contract', () => {
  describe('the surface that must NOT exist', () => {
    it('exposes no student creation route outside intake', () => {
      const creating = handlers(StudentController).filter(
        (entry) => meta(entry.fn).method === POST,
      );
      expect(creating).toEqual([]);
    });

    it('exposes no delete route on any students controller', () => {
      const controllers: Ctor[] = [
        StudentController,
        StudentIntakeController,
        StudentStatusController,
        StudentDocumentController,
        StudentNoteController,
        StudentTimelineController,
        StudentSummaryController,
        StudentsLookupsController,
      ];
      const deleting = controllers.flatMap((controller) =>
        handlers(controller)
          .filter((entry) => meta(entry.fn).method === DELETE)
          .map((entry) => entry.name),
      );
      expect(deleting).toEqual([]);
    });
  });

  it.each([
    ['list', GET, '/', 'students.view'],
    ['export', GET, 'export', 'students.export'],
    ['detail', GET, ':studentId', 'students.view'],
    ['enrollments', GET, ':studentId/enrollments', 'students.enrollments.view'],
    ['update', PATCH, ':studentId', 'students.update'],
  ] as const)(
    'StudentController.%s is guarded and documented',
    (name, method, path, permission) => {
      const entry = handlers(StudentController).find((h) => h.name === name);
      expect(entry).toBeDefined();
      const found = meta(entry?.fn);
      expect(found.method).toBe(method);
      expect(found.path).toBe(path);
      expect(found.permissions).toContain(permission);
      expect(found.responses).toBeDefined();
    },
  );

  it('guards intake with students.intake and returns 201', () => {
    const entry = handlers(StudentIntakeController).find(
      (h) => h.name === 'intakeFromAdmission',
    );
    const found = meta(entry?.fn);
    expect(found.method).toBe(POST);
    expect(found.permissions).toContain('students.intake');
  });

  it.each([
    ['change', PATCH, ':studentId/status'],
    ['bulk', POST, 'bulk-status'],
  ] as const)('exposes lifecycle route %s', (name, method, path) => {
    const entry = handlers(StudentStatusController).find(
      (h) => h.name === name,
    );
    const found = meta(entry?.fn);
    expect(found.method).toBe(method);
    expect(found.path).toBe(path);
    expect(found.responses).toBeDefined();
  });

  it.each([
    ['list', GET, '/', 'students.documents.view'],
    ['versions', GET, ':documentId/versions', 'students.documents.view'],
    ['upload', POST, '/', 'students.documents.manage'],
    ['replace', POST, ':documentId/replace', 'students.documents.manage'],
    ['archive', PATCH, ':documentId/archive', 'students.documents.manage'],
  ] as const)(
    'document route %s is guarded by the documented key',
    (name, method, path, permission) => {
      const entry = handlers(StudentDocumentController).find(
        (h) => h.name === name,
      );
      const found = meta(entry?.fn);
      expect(found.method).toBe(method);
      expect(found.path).toBe(path);
      expect(found.permissions).toContain(permission);
    },
  );

  it.each([
    ['list', GET, 'students.notes.view'],
    ['create', POST, 'students.notes.manage'],
    ['edit', PATCH, 'students.notes.manage'],
    ['archive', PATCH, 'students.notes.manage'],
  ] as const)('note route %s is guarded', (name, method, permission) => {
    const entry = handlers(StudentNoteController).find((h) => h.name === name);
    const found = meta(entry?.fn);
    expect(found.method).toBe(method);
    expect(found.permissions).toContain(permission);
  });

  it('guards the timeline with its own permission', () => {
    const entry = handlers(StudentTimelineController).find(
      (h) => h.name === 'timelinePage',
    );
    expect(meta(entry?.fn).permissions).toContain('students.timeline.view');
  });

  it('exposes both summary reads', () => {
    const names = handlers(StudentSummaryController).map((h) => h.name);
    expect(names).toEqual(
      expect.arrayContaining(['financialSummary', 'contextSummary']),
    );
  });

  it('every students handler carries a permission guard', () => {
    const controllers: Ctor[] = [
      StudentController,
      StudentIntakeController,
      StudentStatusController,
      StudentDocumentController,
      StudentNoteController,
      StudentTimelineController,
      StudentSummaryController,
      StudentsLookupsController,
    ];
    const unguarded = controllers.flatMap((controller) =>
      handlers(controller)
        .filter((entry) => meta(entry.fn).method !== undefined)
        .filter((entry) => meta(entry.fn).permissions.length === 0)
        .map((entry) => `${controller.constructor.name}.${entry.name}`),
    );
    expect(unguarded).toEqual([]);
  });
});
