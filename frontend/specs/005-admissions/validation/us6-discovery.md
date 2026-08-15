# US6 Discovery Evidence

- Search normalizes Arabic/English text; filters are combined after authenticated scope intersection.
- Sorting has a stable ID tie-break, page sizes are bounded, and out-of-range pages are clamped.
- `admission-list-scale.test.ts` creates 10,000 narrow deterministic summaries within the two-second goal.
- Rows group applicant/reference identity to avoid the previous wide-table UX regression.
