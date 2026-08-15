# Data Model: Student Finance

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md) | **Date**: 2026-07-31

Types live under `apps/web/src/features/student-finance/types/`. Shapes below are design contracts, not literal source. Every identifier is branded so ids from different aggregates cannot be swapped.

---

## Identifiers and shared primitives

`types/common.ts`

```text
InvoiceId, InvoiceLineId, InstallmentPlanId, InstallmentId, PaymentId,
DiscountId, ScholarshipId, AdjustmentId, RefundId, FinanceEventId
  = Brand<string, ...>

Money        = { amount: string; currency: string; precision: number }  // decimal string
ActorRef     = { id: string; name: string; active: boolean }
LookupOption = { value: string; label: string; active: boolean }
AuditContext = { createdAt; createdBy: ActorRef; updatedAt; updatedBy: ActorRef; version: number }
Paginated<T> = { items: T[]; total; page; pageSize; totalPages }
Cursor<T>    = { items: T[]; nextCursor?: string }

InvoiceStatus      = "draft" | "issued" | "partially-paid" | "paid" | "cancelled"
InstallmentStatus  = "pending" | "partially-paid" | "paid" | "overdue"
FinancialStatus    = "no-outstanding-balance" | "partial-balance" | "overdue" | "completed"
RefundStatus       = "requested" | "approved" | "completed" | "rejected" | "cancelled"
ReductionKind      = "percentage" | "amount"
```

**Money rule**: `amount` is always a decimal string at `precision`. All arithmetic runs in integer minor units through `shared/utils/money.ts`. No floating-point operator ever touches a money value (research R1).

---

## Entities

### Invoice

The aggregate root. Raised against exactly one enrollment; never deleted.

```text
Invoice extends AuditContext {
  id: InvoiceId
  organizationId: string
  invoiceNumber: string              // system-allocated, unique, not user-editable  (FR-004)
  studentId: string                  // from Student Management
  studentCode: string                // denormalized for search and display
  studentName: string
  enrollmentId: string               // FR-002
  branchId: string                   // scope anchor
  offeringId: string
  offeringLabel: string              // denormalized at creation  (survives repricing)
  offeringKind: OfferingKind
  batchId?: string
  batchLabel?: string
  purpose: string                    // e.g. tuition, registration-fee; part of the idempotency key
  issueDate?: string                 // set at issuance
  dueDate: string
  currency: string
  precision: number

  draft: InvoiceFigures              // mutable only while status === "draft"
  issuedSnapshot?: InvoiceFigures    // frozen at issuance; NEVER rewritten  (FR-007)

  status: InvoiceStatus
  statusHistory: InvoiceStatusChange[]
  cancelledAt?: string
  cancelReason?: string
}

InvoiceFigures {
  totalAmount: Money                 // gross before reductions
  discountTotal: Money
  scholarshipTotal: Money
  finalAmount: Money                 // derived by the reduction policy, never hand-entered
}
```

**Rules**

- `invoiceNumber` unique per `organizationId`; allocation is a service invariant (research R8).
- While `status === "draft"`, `draft` is editable and `finalAmount` is recomputed on every change.
- At issuance, `draft` is copied to `issuedSnapshot` and becomes immutable. Every later derivation reads `issuedSnapshot` **plus** adjustments.
- `status === "cancelled"` removes the invoice from all balance derivations but keeps it readable (FR-009).
- Cancellation is refused while any payment references the invoice (FR-008).

### InstallmentPlan and Installment

```text
InstallmentPlan {
  id: InstallmentPlanId
  invoiceId: InvoiceId
  count: number
  scheduleBasis: "monthly" | "custom"
  firstDueDate: string
  generatedAt: string
  generatedBy: ActorRef
}

Installment {
  id: InstallmentId
  planId: InstallmentPlanId
  invoiceId: InvoiceId
  sequence: number                   // 1..count
  dueDate: string
  amount: Money
  // paidAmount and status are DERIVED, never stored  (research R10)
}
```

**Invariant**: `Σ installment.amount === invoice final amount` exactly, at the configured precision. Enforced by `allocate()` in the shared money module, which asserts the sum before returning (research R5).

**Rules**

- Installment eligibility per product type is configurable; nothing hardcodes that programs allow plans and courses do not (FR-013).
- Regeneration is refused once any installment carries a payment (FR-014).

### Payment

Immutable. No update, no delete — corrections go through a refund (FR-019, research R12).

```text
Payment {
  id: PaymentId
  organizationId: string
  receiptNumber: string              // system-allocated, unique  (FR-004)
  studentId: string
  invoiceId: InvoiceId
  installmentId?: InstallmentId      // when attributed to a specific installment
  branchId: string
  methodId: string                   // configurable payment method
  methodLabel: string
  paymentDate: string
  amount: Money
  notes?: string
  recordedAt: string
  recordedBy: ActorRef
}
```

**Validation** (`schemas/payment-schema.ts`, FR-017)

| Field | Rule |
| --- | --- |
| `amount` | required, decimal string, `> 0`, `<= invoice remaining`, and `<= installment remaining` when an installment is targeted |
| `methodId` | required, must be an **active** configured method |
| `paymentDate` | required, not in the future, not before the invoice issue date |
| `invoiceId` | required; invoice must be `issued` or `partially-paid` — never `draft`, `paid`, or `cancelled` |
| `notes` | optional, ≤ 500 chars |

The remaining-balance check is re-evaluated **inside** the service operation, not from the client's view (research R8).

### Discount and Scholarship

```text
Discount {
  id: DiscountId
  invoiceId: InvoiceId
  kind: ReductionKind
  value: string                      // percentage 0..100, or decimal amount
  reason: string
  approvedBy: ActorRef               // requires finance.discounts.approve
  approvedAt: string
}

Scholarship {
  id: ScholarshipId
  studentId: string
  enrollmentId?: string              // scoped to one enrollment, or all when absent
  name: string
  kind: ReductionKind
  value: string
  coverage: "full-tuition" | "partial-tuition"
  reason: string
  approvedBy: ActorRef               // requires finance.scholarships.approve
  approvedAt: string
}
```

**Validation**

| Rule | Applies to |
| --- | --- |
| percentage within `0..100` | both, when `kind === "percentage"` |
| amount `> 0` and `<= applicable base` | both, when `kind === "amount"` |
| value within the configured discount limit | discount |
| combined reduction never yields a negative final amount | both (FR-022) |
| combined reduction never drops the balance below the amount already collected | both (FR-022, US5-5) |

**Ordering**: scholarship applies to the tuition base first, then discount to the remainder, in one pure function shared by the editor preview, the schema, and the service (FR-024, research R4).

### FinancialAdjustment

A reduction recorded **after** issuance. This is what keeps immutability and "reductions affect future balances" both true (research R3).

```text
FinancialAdjustment {
  id: AdjustmentId
  invoiceId: InvoiceId
  sourceKind: "discount" | "scholarship"
  sourceId: DiscountId | ScholarshipId
  amount: Money                      // always a reduction, always positive
  reason: string
  approvedBy: ActorRef
  createdAt: string
}
```

**Rule**: an adjustment may not reduce the invoice balance below the net amount already collected; that case is refused with a pointer to the refund flow.

### Refund

```text
Refund {
  id: RefundId
  paymentId: PaymentId               // exactly one; required  (FR-025)
  invoiceId: InvoiceId
  studentId: string
  amount: Money
  reason: string
  refundDate: string
  status: RefundStatus
  requestedBy: ActorRef
  approvedBy?: ActorRef              // requires finance.refunds.approve
  completedAt?: string
}
```

**Rules**

- `amount <= payment.amount − Σ prior non-cancelled refunds on that payment` (FR-026).
- Only a `completed` refund affects balances (FR-027).
- Never deletable; reversed only through `status` (FR-028).
- Refund *execution* — moving money to the payer — happens outside this module.

### FinanceTimelineEvent

```text
FinanceTimelineEvent {
  id: FinanceEventId
  studentId: string
  invoiceId?: InvoiceId
  category: "invoice-created" | "invoice-issued" | "invoice-cancelled"
          | "installment-plan-generated" | "payment-received"
          | "discount-applied" | "scholarship-applied"
          | "adjustment-recorded" | "refund-requested" | "refund-completed"
  occurredAt: string
  sequence: number                   // monotonic tiebreak; part of the paging cursor
  actor: ActorRef
  subjectRef?: string
  amount?: Money
  summary: string
}
```

Appended inside the same service command that succeeds; a failed command appends nothing (FR-035). Ordering and cursor paging follow the pattern proven in Student Management: newest first, `(occurredAt, sequence)` keyset.

---

## Derived values (never stored)

`utils/finance-balance.ts` — one pure module, the single source for every figure below (research R2).

```text
invoiceFinal(invoice, adjustments)   = (issuedSnapshot ?? draft).finalAmount − Σ adjustments.amount
netPaid(payments, refunds)           = Σ payments.amount − Σ completedRefunds.amount
invoiceRemaining(...)                = max(0, invoiceFinal − netPaid)

invoiceStatus(invoice, remaining, final):
  cancelled            → "cancelled"
  not issued           → "draft"
  remaining === 0      → "paid"
  remaining < final    → "partially-paid"
  otherwise            → "issued"

installmentPaid(installment, payments)  = Σ payments attributed to it
installmentStatus(installment, paid, now):
  paid >= amount                          → "paid"
  dueDate < now && paid < amount          → "overdue"
  paid > 0                                → "partially-paid"
  otherwise                               → "pending"

studentFinancialStatus(invoices, now):
  any overdue installment or invoice      → "overdue"
  no non-cancelled invoices               → "no-outstanding-balance"
  total remaining === 0                   → "no-outstanding-balance"
  otherwise                               → "partial-balance"
  ("completed" is reached when every enrollment is finished and nothing is outstanding)
```

`now` is injected, never read from a hidden clock, so the overdue boundary is testable (research R10).

---

## Projections

```text
InvoiceSummary          — list row: number, student name/code, offering, batch?, issue and due dates,
                          final amount, paid, remaining, status, branch, updatedAt, version
PaymentSummary          — list row: receipt number, student, invoice number, method, date, amount, branch
InstallmentSummary      — list row: invoice number, student, sequence, due date, amount, paid, status
RefundSummary           — list row: refund, receipt number, student, amount, date, status

InvoiceDetail extends Invoice {
  installments, payments, discounts, scholarships, adjustments, refunds
  derived: { finalAmount, netPaid, remaining, status }
  permissions: FinanceAreaPermissions
}

StudentFinancialProfile {
  studentId, studentCode, studentName, currency, precision
  totals: { totalFees, paidAmount, remainingBalance }
  outstandingInstallments: number
  scholarships: ScholarshipSummary[]
  discounts: DiscountSummary[]
  financialStatus: FinancialStatus
  perEnrollment: { enrollmentId, offeringLabel, batchLabel?, totalFees, paid, remaining, status }[]
  asOf: string
}
```

### Outbound — the contract Student Management already consumes

Structurally identical to `StudentFinancialSummaryResult` in 006 (FR-046):

```text
{ state: "available"; summary: { totalFees, paidAmount, remainingBalance,
                                 activeInstallments, asOf, sourceRevisionId? } }
{ state: "unavailable"; reason: "finance-module-absent" | "source-error" | "timeout" }
{ state: "forbidden" }
```

**Critical**: a student with **no financial records** returns `available` with zero figures — a fact — not `unavailable` (FR-047, US10-2). 006 deliberately made "no data" unrepresentable as zero; this preserves that distinction.

### Outbound — accounting-facing

```text
AccountingContext {
  invoices:  { id, number, studentId, enrollmentId, issueDate, finalAmount, status }[]
  payments:  { id, receiptNumber, invoiceId, methodId, paymentDate, amount }[]
  refunds:   { id, paymentId, amount, refundDate, status }[]
  asOf, currency, precision
}
```

Settled facts and identities only. Carries no student name, address, national identifier, or notes (FR-048).

---

## Relationships

```text
Student (external, read-only)
   │ 1:N
Enrollment (external, read-only)
   │ 1:N  idempotent on (enrollmentId, purpose)
Invoice ──0..1──> InstallmentPlan ──1:N──> Installment
   │  ──1:N──> Payment ──1:N──> Refund
   │  ──1:N──> Discount
   │  ──1:N──> FinancialAdjustment   (post-issuance reductions only)
   └──1:N──> FinanceTimelineEvent
Scholarship ──> Student (optionally scoped to one Enrollment)
```

---

## State transitions

Invoice lifecycle — the only *stored* statuses are the decisions; the rest are derived.

```text
              issued   cancelled
draft            ✓         ✓
issued           —         ✓ (only when no payments exist)
partially-paid   —         ✓ (only when no payments exist → unreachable in practice)
paid             —         —
cancelled        —         —
```

| Transition | Permission | Requires |
| --- | --- | --- |
| `draft → issued` | `finance.invoices.issue` | complete figures; freezes `issuedSnapshot` |
| `→ cancelled` | `finance.invoices.cancel` | reason; **no payments on the invoice** (FR-008) |

`partially-paid` and `paid` are never set by an actor — they are derived from payments and refunds, so they cannot contradict the money recorded.

Refund lifecycle:

```text
requested → approved → completed
requested → rejected
requested | approved → cancelled
```

Only `completed` moves money in the derivation. `approved` requires `finance.refunds.approve`, distinct from `finance.refunds.record`.

---

## Configurable lookups

Served by `StudentFinanceService.lookups()`; nothing below is hardcoded (FR-016, FR-033).

```text
FinanceLookups {
  paymentMethods: LookupOption[]                    // only active ones selectable
  branches, students, offerings, batches: LookupOption[]
  invoiceStatuses, paymentStatuses, refundStatuses: { value, label }[]
  installmentEligibility: { offeringKind: OfferingKind; allowsPlan: boolean; maxCount: number }[]
  discountPolicy: { maxPercentage: string; maxAmount?: Money; requiresApproval: boolean }
  scholarshipPolicy: { maxPercentage: string; requiresApproval: boolean }
  numbering: { invoicePattern: string; receiptPattern: string }
  duePolicy: { defaultDueDays: number; overdueGraceDays: number }
  currency: string
  precision: number
}
```

---

## Query model

```text
InvoiceListQuery {
  search?            // invoice number, receipt number, student name, student code
  branchIds?, studentIds?, offeringIds?, statuses?: InvoiceStatus[]
  dateRange?: { field: "issueDate" | "dueDate"; from?: string; to?: string }
  sort?: { field: "invoiceNumber" | "dueDate" | "finalAmount" | "remaining" | "updatedAt"; direction }
  page, pageSize
}

PaymentListQuery      { search?, branchIds?, studentIds?, methodIds?, dateRange?, sort?, page, pageSize }
InstallmentListQuery  { search?, branchIds?, statuses?: InstallmentStatus[], dateRange?, sort?, page, pageSize }
RefundListQuery       { search?, branchIds?, statuses?: RefundStatus[], dateRange?, sort?, page, pageSize }
FinanceTimelineQuery  { cursor?, limit, categories? }
```

Normalization (`utils/finance-list-query.ts`): trim and fold search (Arabic variants and Arabic-Indic digits), sort and dedupe filter arrays, clamp page and page size, **refuse an inverted date range**, treat ranges as inclusive, and produce a stable serialization for query keys. Every query is intersected with the acting user's organization and authorized branches before results are produced (FR-038, FR-039).
