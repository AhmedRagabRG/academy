# Students route segment

Route pages here are thin Server Components. They await Next.js 16 promise-based
`params`, validate the identifier, and render a feature screen from
`@/features/students`. They never read fixtures, permissions, or service data
directly — that is the feature layer's job.

## Segments

| Path | Screen | Permission |
| --- | --- | --- |
| `/students` | `StudentsScreen` | `students.view` (export also needs `students.export`) |
| `/students/[studentId]` | `StudentOverviewScreen` | `students.view` |
| `/students/[studentId]/edit` | `EditStudentScreen` | `students.update` |
| `/students/[studentId]/documents` | `StudentDocumentsScreen` | `students.documents.view` |
| `/students/[studentId]/notes` | `StudentNotesScreen` | `students.notes.view` |
| `/students/[studentId]/timeline` | `StudentTimelineScreen` | `students.timeline.view` |

There is deliberately **no** `create` segment. Students are produced only by
`studentIntakePort.enrollFromAdmission` from an approved admission, and the module
exposes no manual create and no delete path (spec FR-001, FR-002).

## Why nested segments instead of in-page tabs

`[studentId]/layout.tsx` renders the workspace header and tab navigation; each child
segment owns its own `loading.tsx` and `error.tsx`. That makes "one area fails or is
forbidden while the rest stay usable" (spec US3-5, US3-6) a property of the routing
layer rather than hand-rolled panel state, and it code-splits each area.
