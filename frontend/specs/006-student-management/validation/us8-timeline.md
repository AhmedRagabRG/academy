# Validation: US8 — Review the Student Activity Timeline

**Status**: PASS | **Verified**: 2026-07-31

| Scenario | Evidence (`tests/contract/students/student-timeline-events.test.ts`) |
| --- | --- |
| US8-1 admission and creation history present, in order | "carries admission facts and creation ahead of everything else" |
| US8-2 exactly one event per successful command | "adds exactly one event per successful command" (profile, upload, replace, status) |
| US8-3 no event for a failed command | "adds no event when a command fails"; "adds no event for a retried upload that resolves to an existing version" |
| US8-4 long histories page without losing order | "pages a long history without repeating or skipping events" |
| US8-5 future categories present without implying data loss | `components/student-timeline-mapping.ts` covers `financial-event` and `academic-event` |

Every event carries an actor, a time, and a monotonic sequence —
"assigns every event an actor and a time".

## Defect found and fixed

The keyset cursor comparison was inverted. Ordering is newest-first, so "after the
cursor" means *older* than the cursor; the original `byTime < 0` meant newer events
were included on later pages while older ones were dropped. In practice the timeline
would have repeated recent events and silently skipped history.

Fixed to `byTime > 0` in `utils/student-timeline.ts`. Caught by
`tests/unit/students/student-timeline.test.ts` — "continues from the cursor without
repeating or skipping" and "keeps ordering stable when a newer event is appended
mid-paging" (18 cases total).
