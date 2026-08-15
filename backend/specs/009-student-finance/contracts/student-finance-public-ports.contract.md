# Public Ports Contract: Student Finance Integrations

Ports expose stable domain facts, never Prisma models or repositories. Dependency failures stay distinguishable from ineligible outcomes. Student Finance imports no foreign repository and reads no foreign table.

## Ports Consumed by Student Finance

### Students Enrollment Port — `STUDENTS_ENROLLMENT_PORT` (**not yet implemented**)

Owned by Student Management (`specs/008-student-management`), which is still an unfilled spec. Student Finance depends only on this interface; a test double satisfies it today and the production adapter arrives with module 008. This is the module's one hard prerequisite.

**Resolve a student**

- Input: student ID.
- Output: student ID, student code, display name for search and list rendering, organization ID, primary branch ID, active state.
- Must not expose national identifier, address, contact details, documents, or notes. Finance never renders those and the accounting projection must be able to prove it cannot leak them.

**Resolve an enrollment for invoicing**

- Input: enrollment ID.
- Output: enrollment ID, student ID, offering ID, offering kind, optional batch ID, branch ID, and the **immutable financial snapshot** carried forward from the Admissions approval snapshot — source financial revision ID, source kind, tuition minor units, registration fees minor units, admission-time discount (mode, scaled percentage, amount minor), required amount minor units, currency, precision.
- The snapshot is the only pricing source for raising an invoice. Finance never reads live catalog or batch pricing, which is what makes later pricing changes structurally unable to affect an existing invoice.
- Must distinguish "enrollment not found", "enrollment not in caller's branch scope", and "dependency unavailable"; the last maps to retryable `service-unavailable`.

**List a student's enrollments**

- Input: student ID.
- Output: the per-enrollment set above, for the statement's `perEnrollment[]` breakdown.

**Student-created signal**

- A `student.created` domain event carrying student ID, student code, organization ID, currency, and precision.
- Finance subscribes and provisions exactly one `StudentFinancialAccount`. Provisioning is idempotent on `studentId` at the database level, so a replayed event is a no-op rather than a duplicate account.
- Finance never inserts, updates, or reads a student row directly.

### Organization Master Data Port (existing)

- Resolve `FINANCE_CHARGE_PURPOSE` and `FINANCE_PAYMENT_METHOD` lookup values by ID and by code, with `code`, Arabic `name`, `status`, and `sortOrder`.
- Resolve branches, organization currency, precision, and time zone.
- Inactive values must stay resolvable for historical display while being marked unselectable. A payment recorded on a since-retired method still renders its label; a new payment on it is refused with `payment-method-inactive`.

### Catalog and Program Batches Ports (display only)

- Resolve offering identity, kind, and label; batch identity and label; including historical identities for records pinned before a later change.
- **Never** consulted for pricing. Pricing comes from the enrollment snapshot alone.

### IAM Actor Reference Port

- Resolve bounded employee IDs to name and active state for `recordedBy`, `approvedBy`, `requestedBy`, and timeline actors.
- Must not expose credentials, sessions, roles, or an employee repository.

## Port Exported by Student Finance

### Finance Accounting Port — `FINANCE_ACCOUNTING_PORT`

Serves the future Accounting (Expenses) module and the `GET /finance/accounting-context` read. Settled facts and identities only.

- **Invoices**: invoice ID, invoice number, student ID, enrollment ID, issue date, final amount, status.
- **Payments**: payment ID, receipt number, invoice ID, method ID, payment date, amount.
- **Refunds**: refund ID, payment ID, invoice ID, amount, refund date, status.
- Plus `asOf`, `currency`, `precision`.

Guarantees:

- No student name, address, national identifier, notes, or any other personal field crosses this boundary. An E2E test asserts the response shape contains none of them.
- Only settled facts appear: draft invoices and non-completed refunds are excluded from money figures.
- Accounting never writes to Finance, and Finance never depends on Accounting. The two modules are independent, as the spec requires.
- The port exposes no repository and no Prisma type.

## Events Emitted (audit-ready)

Published after commit, carrying actor, target identifiers, operation, amount, and resulting version — never student names, addresses, identifiers, or notes:

`finance.invoice.raised` · `finance.invoice.updated` · `finance.invoice.issued` · `finance.invoice.cancelled` · `finance.installment-plan.generated` · `finance.payment.recorded` · `finance.discount.approved` · `finance.scholarship.approved` · `finance.adjustment.recorded` · `finance.refund.requested` · `finance.refund.decided` · `finance.refund.completed` · `finance.account.provisioned`

Audit persistence may be added later by subscribing to these events, with no change to any finance service.
