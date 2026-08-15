/**
 * Every Students permission key. Each route and each service operation checks its
 * exact key independently, so an employee may view a student without reaching its
 * notes, documents, or financial context.
 */
export const studentsPermissions = {
  view: "students.view",
  update: "students.update",
  archive: "students.archive",
  activate: "students.activate",
  statusManage: "students.status.manage",
  statusCorrect: "students.status.correct",
  export: "students.export",
  enrollmentsView: "students.enrollments.view",
  documentsView: "students.documents.view",
  documentsManage: "students.documents.manage",
  notesView: "students.notes.view",
  notesManage: "students.notes.manage",
  timelineView: "students.timeline.view",
  financeView: "students.finance.view",
  /** System boundary key for the Admissions enrollment handoff, not an interactive action. */
  intake: "students.intake",
} as const

export type StudentsPermission =
  (typeof studentsPermissions)[keyof typeof studentsPermissions]

export const allStudentsPermissions: readonly StudentsPermission[] =
  Object.values(studentsPermissions)

/** Which permission gates each workspace area. */
export const studentAreaPermission = {
  overview: studentsPermissions.view,
  enrollments: studentsPermissions.enrollmentsView,
  documents: studentsPermissions.documentsView,
  notes: studentsPermissions.notesView,
  timeline: studentsPermissions.timelineView,
  financial: studentsPermissions.financeView,
} as const

export type StudentArea = keyof typeof studentAreaPermission
