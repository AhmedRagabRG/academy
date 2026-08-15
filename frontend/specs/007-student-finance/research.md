# Phase 0 Research: Student Finance

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-07-31

All unknowns carried from the Technical Context are resolved below. No `NEEDS CLARIFICATION` marker remains.

---

## R1. Monetary representation and arithmetic

**Decision**: One shared module, `shared/utils/money.ts`. A `Money` value is `{ amount: string; currency: string; precision: number }` where `amount` is a decimal string. Every operation converts to **integer minor units**, computes with integers, and converts back. Exposed: `toMinor`, `fromMinor`, `add`, `subtract`, `multiplyByPercentage`, `compare`, `isZero`, `isNegative`, `min`, `max`, `allocate`, `formatMoney`. Mixed-currency operands throw rather than coerce.

**Rationale**: Floating-point cannot represent most decimal fractions, so `0.1 + 0.2 !== 0.3` and repeated operations accumulate drift. SC-007 requires zero rounding drift and SC-001 requires balances to reconcile *exactly*. Integer minor units make exactness structural rather than something tests have to chase. Decimal strings at the boundary keep values readable, serializable, and safe to persist later.

**Placement**: `shared/` rather than the feature, because money now recurs in three modules — Admissions carries a `Money` shape, Student Management formats it, and Student Finance computes with it. Constitution IV requires establishing a shared implementation once a pattern recurs.

**Scope boundary**: only *value* mechanics are shared. Business policy — how reductions combine, how installments split, how a balance is derived — stays inside the feature. Migrating Admissions and Student Management onto the shared module is a tracked follow-up, not part of this feature, so no sibling module is modified for it.

**Alternatives considered**:

- _A decimal library (decimal.js, big.js)_ — rejected: adds a dependency for arithmetic that is exact in integers once the precision is fixed, and the constitution restricts the approved stack.
- _Numbers with rounding at the edges_ — rejected: drift is reintroduced by every intermediate operation, and the failure is silent.
- _Storing minor units everywhere_ — rejected for the boundary: less readable in fixtures and future payloads, and it hides the currency's precision. Minor units stay internal to the arithmetic.

---

## R2. Balance derivation — derived, never stored

**Decision**: A student's and an invoice's balance are computed by a pure function from records: issued figures, post-issuance adjustments, payments, and completed refunds. No balance, paid amount, or remaining amount is persisted on any entity. The result is cached by the query layer, never written back.

```text
invoiceFinal   = issuedSnapshot.final − Σ adjustments
netPaid        = Σ payments − Σ completed refunds
remaining      = max(0, invoiceFinal − netPaid)
studentBalance = Σ remaining over non-cancelled invoices
```

**Rationale**: A stored balance is a second source of truth that will eventually disagree with the records that produced it, and finance is exactly where that disagreement is most damaging. SC-001 asks that the balance never disagrees with the underlying records; the cheapest way to guarantee that is to have only one source. Derivation also makes every figure explainable — the timeline and the balance read from the same facts.

**Cost**: derivation runs per student or per invoice on read. Bounded by per-entity indexes (R9), so it is proportional to that student's own records, not the whole store.

**Alternatives considered**:

- _Stored running balance updated on each command_ — rejected: any missed update, failed partial write, or out-of-order operation silently corrupts a monetary figure.
- _Stored balance with a periodic reconciliation job_ — rejected: reconciliation implies drift is expected; it belongs in a system with a real ledger, not a frontend phase.

---

## R3. Issued-invoice immutability versus later reductions

**Decision**: An invoice freezes an `issuedSnapshot` (total, reductions applied at issuance, final amount, currency) at the moment of issuance. Reductions recorded **before** issuance mutate the draft's own figures. Reductions recorded **after** issuance are separate `FinancialAdjustment` records referencing the invoice. Every derivation reads snapshot **plus** adjustments; the snapshot itself is never rewritten.

**Rationale**: This is the direct resolution of the contradiction flagged in the spec checklist — "historical invoices never change after issuance" versus "discounts and scholarships affect future balances only". Both hold simultaneously under this model: the historical document is intact and auditable, while the amount still owed reflects the concession. It also matches how invoices behave in real accounting, where a post-issuance concession is a credit note rather than an edit.

**Guard**: an adjustment may not reduce the balance below the amount already collected (FR-022); that case is refused and the user is directed to a refund.

**Alternatives considered**:

- _Rewriting the invoice figures_ — rejected: violates FR-007 and destroys the audit trail the module is explicitly preparing for.
- _Cancelling and re-issuing_ — rejected: breaks receipt-to-invoice links, changes invoice numbers, and misrepresents history as if the original obligation never existed.
- _Applying the reduction only to future invoices_ — rejected: leaves the current outstanding balance overstated, which is the practical problem a concession is meant to solve.

---

## R4. Reduction ordering

**Decision**: One pure function applies reductions in a fixed order — **scholarship first against the tuition base, then discount against the remainder** — clamped by two floors: the final amount may not go below zero, and the balance may not go below the amount already collected. The same function is used by the invoice editor's live preview, the service's validation, and every balance derivation.

**Rationale**: FR-024 requires a deterministic, consistently applied order. Scholarship-first is the conventional reading (an award reduces the tuition owed; a negotiated discount then applies to what remains) and is the less generous of the two orderings for percentage-on-percentage cases, which is the safer default for the institution. One shared function means the previewed number and the saved number can never differ.

**Confirmation needed**: the ordering is an organizational policy question. It is isolated in a single function so reversing it is a one-line change plus a test update.

**Alternatives considered**:

- _Discount first_ — plausible, produces a different total when both are percentages; deferred to policy confirmation.
- _Both applied to the original base and summed_ — rejected: two 60% reductions would exceed the total, forcing a clamp that makes the result depend on clamp order anyway.

---

## R5. Installment allocation

**Decision**: `allocate(total, count)` in the shared money module divides in minor units and distributes the remainder deterministically — base amount to every installment, with the leftover minor units added to the **final** installment. The function asserts that the parts sum exactly to the input before returning.

**Rationale**: FR-011 and SC-002 require an exact sum for amounts that do not divide evenly. Putting the remainder on the last installment keeps every earlier amount identical, which is what a schedule shown to a student should look like. The internal assertion makes an allocation bug fail loudly at the source rather than as a one-piastre discrepancy discovered later in a balance.

**Alternatives considered**:

- _Largest-remainder distribution across installments_ — rejected: spreads odd minor units unevenly through the schedule for no user benefit.
- _Rounding each installment independently_ — rejected: does not sum to the total, which is the failure the requirement exists to prevent.
- _Remainder on the first installment_ — viable; deferred to the same policy confirmation as R4, and equally a one-line change.

---

## R6. Satisfying Student Management's finance port without a cycle

**Decision**: Student Finance implements the `StudentFinanceReader` interface Student Management already declares, and the implementation is **injected at a composition root**. Student Management gains a small additive registration point (`setStudentFinanceReader`) that defaults to its existing `finance-module-absent` reader when nothing is registered. A single app-level module wires Student Finance's adapter in. Student Management never imports Student Finance.

**Rationale**: Student Finance must read students and enrollments from Student Management, so the dependency already runs finance → students. A reverse import for the reader would create a cycle. Registration inverts control at exactly one point and preserves both the one-directional dependency and Student Management's honest default when finance is absent.

**Behavioural consequence**: `getFinancialSummary` for a student with no financial records must return an **available** result with zero figures, not `unavailable` (FR-047, US10-2). Student Management deliberately made "no data" unrepresentable as zero; that distinction is preserved by distinguishing *no records* (zero, a fact) from *module unreachable* (unavailable).

**Alternatives considered**:

- _Student Management imports Student Finance_ — rejected: dependency cycle.
- _Duplicating balance calculation inside Student Management_ — rejected: a second source of truth for money, the exact risk R2 exists to eliminate.
- _An event bus between modules_ — rejected: far more machinery than a one-time registration, and it makes the read path asynchronous and eventually consistent for no gain.

---

## R7. Where the per-student financial workspace lives

**Decision**: The per-student financial workspace is `/students/[studentId]/finance`, contributed into the existing student workspace through a new shared tab registry (`shared/config/student-workspace-tabs.ts`), the same way features already contribute navigation entries through `foundation-navigation.ts`. The requested `/student-finance/students/[studentId]` route is not created. `/student-finance/*` hosts the cross-student finance queues.

**Rationale**: Student Management already owns a permission-filtered student workspace with tabs, and a second student page would split the record across two competing locations — users would not know which is authoritative, and both would need the same header, status, and permission logic. A registry keeps Student Management from knowing anything about finance, and pays for itself the moment attendance or certificates need a tab.

**Deviation from the request**: this is a deliberate departure from the routing in the plan request. It is a routing change only; every screen the request asked for still exists.

**Alternatives considered**:

- _A parallel `/student-finance/students/[studentId]` page_ — rejected as above.
- _Hardcoding a finance tab into Student Management_ — rejected: couples the modules and repeats for every future tab.

---

## R8. Concurrency and collection safety

**Decision**: Every command carries `expectedVersion` against the invoice aggregate. Payment recording additionally **re-reads and re-checks the remaining balance inside the operation**, after the version check, rather than trusting the amount the client believed was outstanding. Commands touching one invoice serialize through a per-invoice queue in the mock adapter. Numbering allocates through a reservation so two concurrent requests cannot receive the same invoice or receipt number.

**Rationale**: Optimistic versioning alone catches stale *edits* but not two payments computed from the same stale balance — both could pass their version check in sequence and overdraw. Re-checking inside the operation makes the balance floor an invariant of the write itself, which is what FR-042 and SC-003 require.

**Alternatives considered**:

- _Version check only_ — rejected: does not prevent the overdraw case above.
- _Last-write-wins_ — rejected outright by FR-042.

---

## R9. Scale to 50,000 invoices

**Decision**: Per-entity indexes (`byStudent`, `byInvoice`, `byEnrollment`, `byPayment`) built lazily and invalidated on write, from the first commit rather than retrofitted. List reads use narrow projections; balance derivation reads only one student's or one invoice's records through the indexes; the timeline is cursor-paginated; queries carry the scope fingerprint and accept `AbortSignal`.

**Rationale**: SC-010 targets 2s p95 across 50,000 invoices — roughly two and a half times Student Management's record volume, with more related entities per record. The equivalent list path in Student Management was O(n²) because a per-student lookup scanned a flat array inside a filter loop; it was invisible at fixture size and only surfaced against the scale fixture. Building the indexes up front avoids repeating that.

**Alternatives considered**:

- _Add indexes when a problem appears_ — rejected: that is precisely what happened in Student Management, and this module has more records and more joins.
- _Client-side filtering_ — rejected: transfers 50,000 records to the browser and will not survive a real API.

---

## R10. Status derivation and the clock

**Decision**: Invoice status, installment status, and student financial status are all **derived** from records and an injected `now`. The service takes a clock function; tests supply a fixed instant. No status is stored except the explicit lifecycle states an actor sets (Draft → Issued, and Cancelled), which are recorded as transitions.

**Rationale**: Overdue depends on comparing a due date against the current time, so a hidden `Date.now()` makes SC-008's boundary case untestable and makes results differ between server render and client hydration. An injected clock makes "the instant the due date passes" a first-class test case.

**Distinction**: Draft/Issued/Cancelled are *decisions* and are stored with their actor and time. Partially Paid/Paid, installment status, and student financial status are *consequences* and are derived, so they can never contradict the payments that produced them.

**Alternatives considered**:

- _Storing every status_ — rejected: creates the same drift risk as a stored balance.
- _Deriving everything including issuance_ — rejected: issuance is a human decision with an actor and a timestamp, not a function of other data.

---

## R11. Permission model

**Decision**: The module registers these keys, each checked independently at route and operation level: `finance.view`, `finance.invoices.view`, `finance.invoices.create`, `finance.invoices.update`, `finance.invoices.issue`, `finance.invoices.cancel`, `finance.installments.manage`, `finance.payments.view`, `finance.payments.record`, `finance.discounts.approve`, `finance.scholarships.approve`, `finance.refunds.view`, `finance.refunds.record`, `finance.refunds.approve`, `finance.timeline.view`, `finance.export`.

**Rationale**: FR-041 requires discount, scholarship, and refund approval to be distinct from recording a payment — that separation is the module's main internal financial control, and it only means anything if the keys are separate. Recording a refund and approving one are also split, so the person requesting money back is not necessarily the person authorizing it.

**Audience note**: the spec's user list omits Customer Service roles, unlike Student Management. Separate keys make that narrower audience enforceable rather than conventional.

**Alternatives considered**:

- _A single `finance.manage` key_ — rejected: cannot express "may record a payment but may not approve a discount", which is the core segregation-of-duties requirement.

---

## R12. Payment immutability

**Decision**: `Payment` has no update or delete operation on the service facade. Corrections are made by recording a `Refund` against the payment. The facade is asserted to expose no such operation by a contract test, matching the pattern used for student create/delete.

**Rationale**: FR-019 and SC-006. An editable payment record makes every receipt and every historical balance unreliable. Refund-as-correction keeps both the original collection and its reversal visible, which is what an audit needs.

**Alternatives considered**:

- _Soft-deleting or voiding payments_ — rejected: a void is a refund by another name, with weaker semantics and no amount, so it cannot express a partial correction.

---

## R13. Shared currency input

**Decision**: Add `shared/components/forms/currency-field.tsx` — an RHF-bound numeric input that displays the configured currency, enforces the configured precision, folds Arabic-Indic digits on entry, renders the value LTR inside RTL layout, and reports its value as a decimal string rather than a number.

**Rationale**: Every monetary form in this module (invoice amounts, discount value, scholarship amount, payment amount, refund amount) needs identical behavior, and a plain number input reintroduces float parsing at the UI boundary — the exact hazard R1 removes elsewhere. Placing it in `shared/` follows Constitution IV since Admissions has similar monetary inputs today.

**Alternatives considered**:

- _A feature-local field_ — rejected: guarantees duplication the moment another module takes a monetary input.
- _Plain `TextField type="number"`_ — rejected: yields a JavaScript number, loses trailing precision, and does not handle Arabic-Indic digits.

---

## R14. Arabic, RTL, and monetary presentation

**Decision**: Copy lives in `features/student-finance/config/finance-copy.ts`. Monetary values, invoice numbers, receipt numbers, dates, and percentages are wrapped with the existing bidi isolation helper wherever they appear inside Arabic text. Amounts are formatted with `Intl.NumberFormat` in `ar-EG` with explicit currency and the configured precision, and are announced with their currency to assistive technology rather than as a bare number.

**Rationale**: Constitution VII requires RTL-native behavior, and a bare "١٢٠٠٠" read aloud without a currency is ambiguous in a financial context. The bidi helper already exists and is used by sibling features.

---

## Resolved Technical Context

| Item | Resolution |
| --- | --- |
| Language/Version | TypeScript 5 strict, React 19.2.4, Next.js 16.2.6, Node 20+ |
| Primary dependencies | Existing approved stack; **no new dependency** — decimal arithmetic is handled in integer minor units |
| Storage | Deterministic in-memory mock adapter behind `StudentFinanceService` |
| Testing | Vitest 4 + Testing Library + jsdom; Playwright 1.62 + `@axe-core/playwright` |
| Target platform | Evergreen browsers, desktop/laptop/tablet, Arabic RTL default, light/dark/system |
| Project type | Frontend web app in an npm/Turborepo workspace |
| Performance goals | 2s p95 across 50,000 invoices; per-student derivation bounded by indexes |
| Constraints | No delete, no payment edit, immutable issued figures, no negative balance, no money movement, exact permission and branch scope |
| Scale/scope | 9 routes + 1 contributed tab, 12 entities, 10 journeys, 50,000 invoices |
