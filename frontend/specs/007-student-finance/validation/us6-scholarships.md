# Validation: US6 — Award and Apply Scholarships

**Feature**: Student Finance | **Verified**: 2026-08-01 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence |
| --- | --- |
| US6-1 an award is recorded and appears on the financial profile | `scholarship-coverage.test.ts` — "appears on the student's financial profile with its approval information" |
| US6-2 full coverage reduces the affected balance to zero without going negative | "reduces the outstanding balance to exactly zero"; "never drives the balance negative" |
| US6-3 percentage and fixed-amount awards both apply | "reduces by the awarded percentage and no more"; "reduces by a fixed amount" |
| US6-4 an issued invoice keeps its figures; only the unpaid balance moves | "records an adjustment instead of rewriting the issued snapshot" |
| US6-5 a discount and a scholarship combine in one documented order | `reduction-ordering.test.ts` — the whole file |
| US6-6 an award without the approval permission is refused and records nothing | "requires the scholarship approval permission"; "records nothing at all when approval is refused" |

## What "applying" an award actually does

Before this phase `awardScholarship` recorded the award and nothing else — the
balance did not move. It now applies to the student's non-cancelled invoices
(or only those of the named enrollment), and the effect depends on the invoice:

- **Draft** — the invoice's own figures recompute. The discount in force is
  **re-resolved** rather than carried across as a frozen amount, so a 10% discount
  stays 10% of the smaller post-scholarship remainder. Asserted by
  "re-resolves the discount against the smaller remainder rather than freezing it".
- **Issued** — a `FinancialAdjustment` with `sourceKind: "scholarship"`, leaving
  the issued snapshot byte-identical.

## The two floors, and why one of them clamps

`headroom = finalAmount − netPaid` is computed per invoice, and every reduction is
clamped to it. This is what lets a full-tuition award mean "the student owes
nothing more" without pretending money already collected was never taken:

- a fully paid invoice has zero headroom and is skipped entirely
  ("leaves a fully paid invoice's figures alone")
- a part-paid invoice reduces exactly to what was collected
  ("stops at the already-collected amount rather than breaching the floor")
- cancelled invoices are excluded from the whole operation

This clamping shaped the form too. An earlier version of the dialog checked the
collected floor against the student's **aggregate** totals and refused a
legitimate 100% award that the service would have applied per invoice without
issue. A form that refuses what the service accepts is the one failure a user
cannot work around, so the aggregate check was removed and the reasoning recorded
in `validateScholarship`. `scholarship-form.test.tsx` pins the behaviour with
"does not refuse an award the service would clamp per invoice".

## FR-024: the documented order

**Scholarship against the tuition base first, then discount against the
remainder.** With a 20% scholarship and a 10% discount the figures are
`0.20 × total`, `0.08 × total`, and a final of `0.72 × total` — asserted on the
seeded invoice, together with an explicit assertion that the figures are *not*
those of the reversed order (`0.10` and `0.70`).

The order of **approval** does not change the outcome: recording the discount
first and then the scholarship gives the same final amount, the same scholarship
total, and the same discount total as the reverse.

Post-issuance is different by nature and documented as such: each adjustment
resolves against what is owed at the time it is approved, so two sequential
reductions compound (`issued × 0.9 × 0.75`). That is the correct reading of an
approval acting on a current balance, not an ordering inconsistency — the
single-computation order in FR-024 governs the pre-issuance derivation.

## Combined reductions never breach a floor

- 50% discount plus a 100% scholarship on a draft → final exactly zero, never
  negative
- 50% discount plus an 80% scholarship → combined reduction ≤ the invoice total
- a 100% award on a part-paid student → final never below net paid

## UI

`scholarship-form.test.tsx` (17 cases):

- choosing **full coverage removes the value field** rather than leaving a
  control with no effect, and shows what full coverage means for collected money
- when the configured cap is below 100, full coverage is **shown as unavailable**
  with the cap named, instead of being offered and then refused on submit
- the cap appears in the value label for partial awards
- name and reason are both required; focus moves to the first invalid field
- the scope selector lists every enrollment plus "all enrollments", and is
  omitted entirely when the student has only one
- history names the **coverage** rather than leaving `100%` to be interpreted —
  a full-tuition award and a 100% partial award are the same number and different
  decisions — and shows the approver and date for each

## Success criteria

- **SC-001** balances remain consistent across scholarships, discounts, payments
  and refunds — PASS
- **SC-009** issued figures never change — PASS
- **SC-012** exactly one timeline event per award, none per refusal — PASS

## Gates

`npm run typecheck`, `npm run lint` (0 errors), `npm run build`, and `npm run test`
(129 files, 850 tests) all pass.
