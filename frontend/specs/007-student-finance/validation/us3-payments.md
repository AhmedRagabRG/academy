# Validation: US3 — Record Payments and Issue Receipts

**Feature**: Student Finance | **Verified**: 2026-08-01 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence |
| --- | --- |
| US3-1 a valid payment creates a uniquely numbered receipt with full metadata | `payment-limits.test.ts` — "carries full receipt metadata" |
| US3-2 a partial payment reduces the balance by exactly that amount | "accepts a partial payment and reduces the balance by exactly that amount" |
| US3-3 settling the remainder marks the invoice Paid | "marks the invoice paid when the remainder is settled exactly" |
| US3-4 an over-limit payment is refused with no receipt, balance, or status change | "refuses an amount one minor unit above…", "leaves no receipt, no balance change, and no status change on refusal" |
| US3-5 an installment-attributed payment updates that installment and keeps totals consistent | "refuses an amount exceeding the targeted installment", "keeps invoice totals consistent with the sum of its installments" |
| US3-6 zero/negative amounts and inactive methods are refused with field-specific guidance | "refuses zero and negative amounts", "refuses an inactive payment method", "refuses an unknown payment method" |
| US3-7 a recorded payment cannot be edited or deleted | "offers no way to edit or delete a recorded payment" |

## Concurrency: SC-003 under contention

Two mechanisms combine (research R8):

1. `expectedVersion` rejects a write computed from a stale view.
2. `recordPayment` re-reads the remaining balance **inside** the operation rather
   than trusting the caller's figure — which is the only thing that catches an
   over-limit request from a caller whose version is current.

`payment-concurrency.test.ts` (7 cases) covers: two payments from the same view
admit exactly one (the other gets `version-conflict`); ten racing payments never
drive the balance negative and never collect more than the invoice final amount;
the guard holds with injected latency, so it is not an artefact of execution speed;
an over-limit payment is refused even with a *current* version; sequential
collection to settlement then refuses further payment; receipt numbers stay
distinct under race; and exactly one timeline event is recorded per payment that
actually landed.

### A test bug caught during this phase

The first version of these tests asserted `netPaid <= remainingBefore`. That is
nonsense: `netPaid` is the **total ever collected** on the invoice, while
`remaining` was what was still outstanding at the start. On an invoice with 1500
already collected and 500 outstanding, a valid 100 payment makes `netPaid` 1600 —
which the assertion flagged as an overdraw.

Diagnosed by tracing the actual outcomes (1 fulfilled, 4 `version-conflict`) rather
than assuming the product was wrong. The guard was working; the assertion was
comparing two different quantities. Corrected to the real invariants: the balance
never goes negative, and collection never exceeds the invoice's final amount.

## UI

`tests/integration/student-finance/payment-form.test.tsx` (14 cases):

- modal dialog, focus moved to the amount field on open
- the **remaining balance is displayed**, not left for the user to compute
- only **active** payment methods are offered
- the amount is reported as a **decimal string, never a JavaScript number** — float
  parsing at the UI boundary would reintroduce the drift the money module removes
- an over-limit amount is refused with a message naming the limit; exactly the
  remaining balance is accepted
- focus moves to the first invalid field on a failed submit
- once an installment is targeted, the **installment ceiling** applies — 300 is
  refused against a 250 installment even though the invoice has 600 outstanding
- only installments that still carry a balance are offered, so the form cannot
  produce a guaranteed refusal
- the dialog states that payments cannot be edited later

Validation delegates to `createPaymentSchema`, the same schema the service
enforces, so the form can never accept a value the service would refuse.

## Success criteria

- **SC-003** 100% of over-limit payment attempts refused with no balance change — PASS
- **SC-004** receipt numbers unique, including under race — PASS
- **SC-006** every payment edit/delete attempt refused — PASS
- **SC-012** one timeline event per success, none per failure — PASS

## Gates

`npm run typecheck`, `npm run lint` (0 errors), `npm run build` (payments route
compiled), and `npm run test` (120 files, 711 tests) all pass.
