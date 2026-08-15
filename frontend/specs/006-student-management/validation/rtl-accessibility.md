# Validation: RTL & Accessibility (T153, T154, T156)

**Feature**: Student Management | **Verified**: 2026-07-31

## Arabic and RTL

- All user-facing copy lives in `features/students/config/students-copy.ts` — one Arabic message map, keeping content separable from layout for future languages.
- `dir="rtl"` and `lang="ar"` asserted in `playwright/accessibility/student-management-a11y.spec.ts`.
- Mixed-direction values (student codes, national identifiers, phones, dates, money) are wrapped in `<bdi dir="ltr">` via `StudentBidiValue`, used across 10 files: list columns, workspace header, detail lists, enrollments, documents, document history, notes, timeline, financial summary, bulk outcomes.
- Layout uses logical properties (`ms-`, `ps-`, `start-`, `end-`) so the sidebar rail, tab underline, table alignment, and timeline connector mirror correctly.
- The sidebar disclosure chevron rotates with an `rtl:` variant so it points the correct way in both directions.

## Accessibility

| Concern | Implementation | Test |
| --- | --- | --- |
| Workspace tabs | Landmark `nav` of links with `aria-current="page"`; all items tabbable | `student-tab-navigation.test.tsx` (7 cases) |
| Sidebar groups | Disclosure `button` with `aria-expanded`/`aria-controls`; collapsed children removed from the a11y tree via `hidden` | `sidebar-navigation.test.tsx` (6 cases) |
| Status dialog | `role="dialog"`, `aria-modal`, focus moved in on open and restored on close | `student-lifecycle.test.tsx` (10 cases) + keyboard spec |
| Form errors | `role="alert"` summary, focus to summary then first invalid field, each message links to its field | `student-editor.test.tsx` (4 cases) |
| Field errors | `aria-invalid` + `aria-describedby` on every field | shared form components |
| Labelled data | `dl`/`dt`/`dd` so label-value pairs are announced as pairs | `StudentDetailList` |
| Timeline | Ordered list with `<time datetime>` | `Timeline` |
| Status encoding | Arabic text always present; colour is decorative only | `students-list.test.tsx` — "encodes status with text, never colour alone" |
| Forbidden areas | Explicit `role="note"` message, never a silent empty state | `student-workspace-areas.test.tsx` |
| Live regions | `aria-live="polite"` on bulk outcomes and upload status | `StudentBulkOutcome`, `FileDropzone` |

## Automated checks

`playwright/accessibility/student-management-a11y.spec.ts` runs axe across all six
student routes in light and dark themes, plus the open status dialog, asserting zero
serious or critical violations. **Not yet executed** — see `constitution.md` gates.
