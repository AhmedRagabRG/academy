# Contracts: Student Finance

**Feature**: [../spec.md](../spec.md) | **Plan**: [../plan.md](../plan.md) | **Data model**: [../data-model.md](../data-model.md)

Internal frontend, route, service, dependency, and future-consumer contracts. No HTTP/OpenAPI surface is invented because a live backend, a payment gateway, and the Accounting module are outside this phase.

---

## Public Feature Boundary

`features/student-finance/index.ts` exports:

- route-facing screens (`FinanceDashboardScreen`, `InvoicesScreen`, `CreateInvoiceScreen`, `InvoiceDetailScreen`, `PaymentsScreen`, `InstallmentsScreen`, `RefundsScreen`, `StudentFinanceWorkspaceScreen`)
- `studentFinanceNavigation`, `studentFinanceWorkspaceTab`, and the permission-key constants
- consumer-safe types: `InvoiceSummary`, `InvoiceDetail`, `StudentFinancialProfile`, `AccountingContext`
- the service contract type `StudentFinanceService` and the wired `studentFinanceService`
- `studentFinanceReaderAdapter` — the implementation of Student Management's declared port
- `financeScenarios` for deterministic test control

Fixtures, the mock adapter internals, schemas, hooks, policies, and presentational components stay private.

Student Finance consumes Student Management, Admissions, Organization, Academic Catalog, and Program Batch facts through **Student-Finance-owned narrow reader ports**. It never imports their fixtures, internal schemas, screens, or mutable DTOs.

**Dependency direction is one-way**: `student-finance → students`. Student Management never imports Student Finance (research R6).

---

## Route Contract

| Route | Purpose | Required permission |
| --- | --- | --- |
| `/student-finance` | Finance dashboard: outstanding, overdue, collection summary | `finance.view` |
| `/student-finance/invoices` | Invoice queue with search, filters, sorting, pagination, export | `finance.invoices.view`; export also `finance.export` |
| `/student-finance/invoices/create` | Raise an invoice against an enrollment | `finance.invoices.create` |
| `/student-finance/invoices/[invoiceId]` | Invoice detail: figures, installments, payments, reductions, refunds | `finance.invoices.view` plus per-section keys |
| `/student-finance/payments` | Payment queue | `finance.payments.view` |
| `/student-finance/installments` | Installment queue, including overdue | `finance.invoices.view` |
| `/student-finance/refunds` | Refund queue | `finance.refunds.view` |
| `/students/[studentId]/finance` | Per-student financial workspace (contributed tab) | `finance.view` |

There is **no** `/student-finance/students/[studentId]` route. The per-student view is contributed into the existing student workspace instead of duplicating it (research R7).

Next.js 16 pages await promise-based `params`, validate identifiers, and pass strings to feature screens. Direct routes return **forbidden** for known but unauthorized records and **not found** for absent or cross-organization identifiers, without disclosing protected facts. Each segment owns its own `loading.tsx` and `error.tsx`.

---

## Service Context

The adapter receives authenticated context outside command payloads, sourced from `shared/store/employee-context-store.ts`: organization id, user id, effective permission keys, authorized branch ids, explicit organization-wide capability, locale, time zone, currency, precision, and a stable scope fingerprint used in query keys.

Commands never accept actor, organization, roles, permissions, or arbitrary scope. The service also receives an injected **clock** so overdue derivation is deterministic in tests (research R10).

---

## Student Finance Service Facade

All operations are asynchronous, accept cancellation on reads, return cloned typed projections, and throw only typed `FinanceError` values.

**Deliberately absent, and must stay absent**: no delete on any entity, and no update or delete on `Payment` (FR-001, FR-019).

### Reads

- `listInvoices(query, signal?) -> Paginated<InvoiceSummary>`
- `getInvoice(invoiceId, signal?) -> InvoiceDetail`
- `listPayments(query, signal?) -> Paginated<PaymentSummary>`
- `listInstallments(query, signal?) -> Paginated<InstallmentSummary>`
- `listRefunds(query, signal?) -> Paginated<RefundSummary>`
- `getStudentFinancialProfile(studentId, signal?) -> StudentFinancialProfile`
- `listTimeline(studentId, query, signal?) -> Cursor<FinanceTimelineEvent>`
- `lookups(signal?) -> FinanceLookups`
- `getAccountingContext(query, signal?) -> AccountingContext`
- `exportInvoices(query, signal?) -> string`

### Commands

- `raiseInvoices({ enrollmentId, purposes?, expectedEnrollmentVersion }) -> InvoiceSummary[]` — **idempotent** on `(enrollmentId, purpose)`
- `updateDraftInvoice({ invoiceId, input, expectedVersion }) -> InvoiceDetail`
- `issueInvoice({ invoiceId, expectedVersion }) -> InvoiceDetail`
- `cancelInvoice({ invoiceId, reason, expectedVersion }) -> InvoiceDetail`
- `generateInstallmentPlan({ invoiceId, count, scheduleBasis, firstDueDate, expectedVersion }) -> InvoiceDetail`
- `recordPayment({ invoiceId, installmentId?, methodId, paymentDate, amount, notes?, expectedVersion }) -> PaymentSummary`
- `applyDiscount({ invoiceId, kind, value, reason, expectedVersion }) -> InvoiceDetail`
- `awardScholarship({ studentId, enrollmentId?, name, kind, value, coverage, reason }) -> StudentFinancialProfile`
- `requestRefund({ paymentId, amount, reason, refundDate }) -> RefundSummary`
- `decideRefund({ refundId, decision: "approved" | "rejected", reason?, expectedVersion }) -> RefundSummary`
- `completeRefund({ refundId, expectedVersion }) -> RefundSummary`

Every command carries `expectedVersion` against the invoice aggregate except `awardScholarship` and `requestRefund`, which create independent records.

### Invariants enforced inside the service, not the UI

1. `recordPayment` re-reads the remaining balance **inside** the operation and refuses any amount exceeding it, so two concurrent payments cannot overdraw (FR-042, research R8).
2. `issueInvoice` copies `draft` into `issuedSnapshot`; no later operation writes to `issuedSnapshot` (FR-007).
3. `applyDiscount` on an issued invoice creates a `FinancialAdjustment` rather than mutating figures (FR-023).
4. Any adjustment that would drop the balance below the net collected amount is refused (FR-022).
5. `cancelInvoice` is refused while any payment references the invoice (FR-008).
6. Refund amount is capped at the referenced payment less prior non-cancelled refunds (FR-026).
7. Invoice and receipt numbers are allocated through a reservation, so concurrent requests cannot collide (FR-004).
8. Installment amounts always sum exactly to the invoice final amount (FR-011).

---

## Outbound Reader Ports

Owned by `features/student-finance/services/finance-dependency-readers.ts`.

```text
StudentDirectoryReader {
  getStudent(studentId, signal?) -> { id, code, name, branchIds, status }
  listEnrollments(studentId, signal?) -> { id, offeringId, offeringKind, offeringLabel,
                                           batchId?, batchLabel?, branchId, status }[]
  searchStudents(term, signal?) -> LookupOption[]
}

AdmissionTermsReader {
  getAgreedTerms(enrollmentId, signal?) -> { productPrice: Money; registrationFees: Money;
                                             agreedDiscount?: Money; requiredAmount: Money } | undefined
}

OrganizationFinanceReader {
  getFinanceLookups(signal?) -> { branches, paymentMethods, discountPolicy, scholarshipPolicy,
                                  numbering, duePolicy, installmentEligibility, currency, precision }
}

OfferingPricingReader { getOfferingLabels(ids, signal?) -> {...}[] }
BatchPricingReader    { getBatchLabels(ids, signal?) -> {...}[] }
```

`AdmissionTermsReader` supplies the **starting figures** for the first invoice. Once an invoice exists it retains its own recorded figures, so later repricing or archival in the catalog never rewrites it.

---

## Inbound Contract — satisfying Student Management

Student Management declares `StudentFinanceReader` and wires a default returning `{ state: "unavailable", reason: "finance-module-absent" }`. Student Finance supplies the real implementation:

```text
studentFinanceReaderAdapter: StudentFinanceReader = {
  getFinancialSummary(studentId, signal?) -> StudentFinancialSummaryResult
}
```

**Wiring (research R6)** — Student Management gains one additive registration point:

```text
// features/students/services/student-finance-registry.ts   (new, additive)
setStudentFinanceReader(reader: StudentFinanceReader): void
resolveStudentFinanceReader(): StudentFinanceReader   // falls back to the existing default
```

A single app-level composition module calls `setStudentFinanceReader(studentFinanceReaderAdapter)` once. Student Management's behaviour is unchanged when nothing is registered.

**Result mapping**:

| Situation | Result |
| --- | --- |
| Student has invoices | `available` with real figures matching this module's records |
| Student exists, **no financial records** | `available` with **zero** figures — a fact, not an absence (FR-047) |
| Finance service unreachable or failing | `unavailable` with `source-error` / `timeout` |
| Caller lacks `finance.view` or student is out of scope | `forbidden` |

The zero-versus-unavailable distinction is the point of this contract: 006 deliberately made "no data" unrepresentable as zero, and this module must not blur it.

---

## Workspace Tab Contribution

```text
// shared/config/student-workspace-tabs.ts   (new, additive)
StudentWorkspaceTab { id, segment, label, permissionKey, order }
studentWorkspaceTabs: readonly StudentWorkspaceTab[]
```

Student Management reads this registry when building its tab list, exactly as `foundation-navigation.ts` aggregates per-feature navigation entries. Student Finance contributes one entry (`segment: "finance"`, `permissionKey: "finance.view"`). Neither module imports the other.

---

## Error Contract

```text
FinanceError { code: FinanceErrorCode; details?: {...} }

FinanceErrorCode =
  | "not-found" | "forbidden" | "out-of-scope"
  | "version-conflict"                  // details: { currentVersion }
  | "validation-failed"                 // details: { fieldErrors }
  | "invoice-immutable"                 // issued figures cannot change
  | "invoice-not-payable"               // draft, paid, or cancelled
  | "invoice-has-payments"              // cancellation blocked
  | "payment-exceeds-balance"           // details: { remaining }
  | "installment-exceeds-remaining"
  | "payment-method-inactive"
  | "payment-immutable"                 // edit or delete attempted
  | "installments-not-permitted"        // product type disallows plans
  | "plan-has-payments"                 // regeneration blocked
  | "reduction-exceeds-limit"           // details: { limit }
  | "reduction-below-collected"         // details: { collected }
  | "negative-amount" | "invalid-currency" | "invalid-date-range"
  | "refund-exceeds-payment"            // details: { refundable }
  | "refund-requires-payment"
  | "duplicate-number"
  | "service-unavailable"
```

Errors never carry student personal data. Every code maps to specific Arabic guidance; no code falls back to a generic message.

---

## Query Key Contract

`services/finance-query-keys.ts` produces normalized, scope-fingerprinted keys.

```text
["student-finance", fingerprint, "invoices", serializedQuery]
["student-finance", fingerprint, "invoice", invoiceId]
["student-finance", fingerprint, "payments", serializedQuery]
["student-finance", fingerprint, "installments", serializedQuery]
["student-finance", fingerprint, "refunds", serializedQuery]
["student-finance", fingerprint, "profile", studentId]
["student-finance", fingerprint, "timeline", studentId, serializedTimelineQuery]
["student-finance", fingerprint, "lookups"]
```

Invalidation: any invoice-affecting command invalidates that invoice, the invoice list, the student's profile, and the student's timeline. `recordPayment` additionally invalidates payments and installments. Refund decisions invalidate refunds, the invoice, the profile, and the timeline. **Every balance-affecting command also invalidates the Student Management financial-summary key** so the student workspace and the finance workspace never show different numbers.

---

## Future Consumer Contract

`getAccountingContext(query)` is the stable read surface for future Accounting and Reporting (FR-048).

Guarantees: permission-scoped identically to interactive reads; read-only; carries settled financial facts and identities only — no student name, address, national identifier, or notes; additive evolution only.

Future backend authorization, tenant isolation, audit persistence, financial controls, and human approval remain authoritative. No automation may approve a discount, scholarship, or refund.
