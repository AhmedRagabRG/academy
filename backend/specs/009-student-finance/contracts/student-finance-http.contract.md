# HTTP Contract: Student Finance

All paths sit beneath `/api/v1`. JSON successes use the global `{success:true,data,meta?}` envelope; errors use `{success:false,error:{code,message,details?}}` with Arabic messages and closed codes. IDs are UUIDs, timestamps are UTC ISO strings with milliseconds, calendar dates are `YYYY-MM-DD` with inclusive upper bounds, and `Money` is `{amount:"18000.00",currency:"EGP",precision:2}` backed by integer minor units.

## Shared Rules

- Lists use `page` and `pageSize` (defaults 1 and 20, maximum 100) and return `meta.{total,page,limit,totalPages}`. An over-range page returns HTTP 200 with an empty `data` array and correct `meta`, never a 4xx.
- The finance timeline is the documented cursor read and returns `{items,nextCursor}`.
- Search folds Arabic letter variants, diacritics, and Arabic-Indic digits identically to the client.
- Every list is filtered to the caller's `authorizedBranchIds` unless the caller is `organizationWide`. A detail request for an out-of-scope record returns the distinct `out-of-scope` code, never a generic `forbidden`.
- Every mutation carries `expectedVersion`. A mismatch returns HTTP 409 `version-conflict` with `currentVersion` as a first-class field on the error object.
- Detail responses carry a computed per-record `permissions` object covering all 16 `finance.*` keys.
- An inverted date range returns `invalid-date-range`.
- `hasNoRecords` is set explicitly. A failed or empty summary is never reported as zeros.

## Prohibited Surface — asserted by contract test

- No `DELETE` on any finance route.
- No `PATCH` or `PUT` on `/finance/payments/:id`. Payment corrections go through a refund.
- No route writes an invoice's issued snapshot. Post-issuance reductions become `FinancialAdjustment` records.

## Invoices

| Operation | Method + path | Permission | Body / query |
|---|---|---|---|
| List | `GET /finance/invoices` | `finance.invoices.view` | `search`, `branchIds[]`, `studentIds[]`, `offeringIds[]`, `batchIds[]`, `statuses[]`, `dateRange{field:issueDate\|dueDate,from,to}`, `sortBy=invoiceNumber\|dueDate\|finalAmount\|remaining\|updatedAt`, `sortOrder`, `page`, `pageSize` |
| Export | `GET /finance/invoices/export` | `finance.export` | Same query; returns `text/csv; charset=utf-8` with BOM |
| Detail | `GET /finance/invoices/:invoiceId` | `finance.invoices.view` | — |
| Raise | `POST /finance/invoices` | `finance.invoices.create` | `{enrollmentId, purposes:[string]}` → array of `InvoiceSummary`, one per purpose |
| Update draft | `PATCH /finance/invoices/:invoiceId` | `finance.invoices.update` | `{input:{totalAmount?,dueDate?,discount?,scholarship?}, expectedVersion}` |
| Issue | `POST /finance/invoices/:id/issue` | `finance.invoices.issue` | `{expectedVersion}` → `InvoiceDetail` |
| Cancel | `POST /finance/invoices/:id/cancel` | `finance.invoices.cancel` | `{reason, expectedVersion}` → `InvoiceDetail` |
| Generate plan | `POST /finance/invoices/:id/installment-plan` | `finance.installments.manage` | `{count, scheduleBasis, firstDueDate, customDueDates?, expectedVersion}` → `InvoiceDetail` |
| Apply discount | `POST /finance/invoices/:id/discounts` | `finance.discounts.approve` | `{kind, value, reason, expectedVersion}` → `InvoiceDetail` |

`batchIds[]` is the owner-approved amendment; invoices without a batch never match a non-empty batch filter, so it is meaningful only for Professional Program offerings.

Raising is idempotent on `(enrollmentId, purpose)` — a repeat returns the existing invoices rather than duplicating them. `purposes[]` accepts active `FINANCE_CHARGE_PURPOSE` lookup codes.

**Protected on update**: the whole record when status is not `DRAFT` (`invoice-immutable` with `fromStatus` and `allowed[]`); `invoiceNumber` (system-generated); `issuedSnapshot` (written once at issuance); `draft.finalAmount`, `discountTotal`, `scholarshipTotal` (derived by the reduction policy); `status` (issue/cancel endpoints only, and `partially-paid`/`paid` are never settable); `studentId`, `enrollmentId`, `offeringId`, `purpose` (fixed at raise time); `statusHistory` (append-only).

**Invoice transitions**

| From | To | Permission | Reason | Blocked by payments |
|---|---|---|---|---|
| `draft` | `issued` | `finance.invoices.issue` | no | no |
| `draft` | `cancelled` | `finance.invoices.cancel` | yes | no |
| `issued` | `cancelled` | `finance.invoices.cancel` | yes | yes → `invoice-has-payments` |
| `partially-paid` | `cancelled` | `finance.invoices.cancel` | yes | yes |
| `paid` | — | terminal | | |
| `cancelled` | — | terminal | | |

## Payments

| Operation | Method + path | Permission | Body / query |
|---|---|---|---|
| List | `GET /finance/payments` | `finance.payments.view` | `search` (receiptNumber, invoiceNumber, studentCode, studentName), `branchIds[]`, `studentIds[]`, `methodIds[]`, `dateRange{field:paymentDate}`, `sortBy=receiptNumber\|paymentDate\|amount`, `sortOrder`, `page`, `pageSize` |
| Record | `POST /finance/payments` | `finance.payments.record` | `{invoiceId, installmentId?, methodId, paymentDate, amount, notes?, expectedVersion}` → `PaymentSummary` |

Server-side re-validation, every rule enforced inside the transaction:

| Rule | Error code | Extra detail |
|---|---|---|
| Amount is a decimal string | `validation-failed` | `fieldErrors` |
| Amount > 0 | `negative-amount` | — |
| Amount ≤ invoice remaining | `payment-exceeds-balance` | `remaining` |
| Amount ≤ installment remaining when targeted | `installment-exceeds-remaining` | `remaining` |
| Method exists | `validation-failed` | — |
| Method is active | `payment-method-inactive` | — |
| Payment date not in the future | `invalid-date-range` | — |
| Payment date ≥ invoice issue date | `invalid-date-range` | — |
| Invoice is payable (not draft or cancelled) | `invoice-not-payable` | `fromStatus` |
| Notes ≤ 500 characters | `validation-failed` | `fieldErrors` |
| Any mutation of a recorded payment | `payment-immutable` | — |

The remaining balance is always recomputed server-side; a client-supplied balance is treated as stale.

## Installments

| Operation | Method + path | Permission | Query |
|---|---|---|---|
| List | `GET /finance/installments` | `finance.invoices.view` | `search` (invoiceNumber, studentCode, studentName), `branchIds[]`, `statuses[]`, `dateRange{field:dueDate}`, `sortBy=dueDate\|amount\|sequence`, `sortOrder`, `page`, `pageSize` |

`paidAmount`, `remaining`, and `status` on every installment row are derived, never stored.

Plan generation validation: `count` is an integer within `1 … installmentEligibility[offeringKind].maxCount`; `allowsPlan === false` returns `installments-not-permitted`; an existing installment carrying a payment returns `plan-has-payments`; amounts allocate equally with the remainder on the last installment and must sum to the total exactly.

## Refunds

| Operation | Method + path | Permission | Body / query |
|---|---|---|---|
| List | `GET /finance/refunds` | `finance.refunds.view` | `search` (invoiceNumber, studentCode), `branchIds[]`, `statuses[]`, `dateRange{field:refundDate}`, `sortBy=refundDate\|amount`, `sortOrder`, `page`, `pageSize` |
| Request | `POST /finance/refunds` | `finance.refunds.record` | `{paymentId, amount, reason, refundDate}` → `RefundSummary` |
| Decide | `PATCH /finance/refunds/:id/decision` | `finance.refunds.approve` | `{decision, reason?, expectedVersion}`; reason required on reject |
| Complete | `POST /finance/refunds/:id/complete` | `finance.refunds.approve` | `{expectedVersion}` |

**Refund transitions**

| From | To | Permission | Reason |
|---|---|---|---|
| `requested` | `approved` | `finance.refunds.approve` | no |
| `requested` | `rejected` | `finance.refunds.approve` | yes |
| `requested` | `cancelled` | `finance.refunds.record` | yes |
| `approved` | `completed` | `finance.refunds.approve` | no |
| `approved` | `cancelled` | `finance.refunds.approve` | yes |
| `completed` / `rejected` / `cancelled` | — | terminal | |

Validation: amount > 0 and ≤ the payment's refundable remainder (payment amount less refunds already requested, approved, or completed) → `refund-exceeds-payment` with `refundable`; total completed refunds ≤ total collected; reason ≥ 3 characters; refund date not in the future; a refund requires an existing payment → `refund-requires-payment`. Only a `completed` refund moves money in the balance derivation.

## Scholarships

| Operation | Method + path | Permission | Body |
|---|---|---|---|
| Award | `POST /finance/scholarships` | `finance.scholarships.approve` | `{studentId, enrollmentId?, name, kind, value, coverage, reason}` → `StudentFinancialProfile` |

An absent `enrollmentId` scopes the scholarship to every enrollment of the student. Value may not exceed `scholarshipPolicy.maxPercentage` → `reduction-exceeds-limit` with `limit`. A reduction that would push a balance below the collected amount → `reduction-below-collected` with `collected`.

## Student Statement, Timeline, Dashboard, Lookups, Integration

| Operation | Method + path | Permission | Notes |
|---|---|---|---|
| Financial profile | `GET /finance/students/:studentId/profile` | `finance.view` | Read-only. Returns `totals{totalFees,paidAmount,remainingBalance}`, `outstandingInstallments`, `scholarships[]`, `discounts[]`, `financialStatus`, `perEnrollment[]`, `hasNoRecords`, `asOf`. |
| Finance timeline | `GET /finance/students/:studentId/timeline` | `finance.timeline.view` | `?limit=&cursor=&categories=`; returns `{items,nextCursor}`. Categories: invoice-created, invoice-issued, invoice-cancelled, installment-plan-generated, payment-received, discount-applied, scholarship-applied, adjustment-recorded, refund-requested, refund-completed. |
| Dashboard summary | `GET /finance/dashboard/summary` | `finance.view` | Invoice-list filters minus paging and sorting. Returns `invoiced`, `collected`, `outstanding`, `unsettledInvoices`, `hasNoRecords`, `asOf`. |
| Lookups | `GET /finance/lookups` | `finance.view` | Bounded closed set: `paymentMethods`, `chargePurposes`, `branches`, `offerings`, `batches`, `invoiceStatuses`, `refundStatuses`, `installmentEligibility`, `discountPolicy`, `scholarshipPolicy`, `numbering`, `duePolicy`, `currency`, `precision`. |
| Accounting context | `GET /finance/accounting-context` | `finance.view` | Settled facts and identifiers only — no student name, address, national identifier, or notes. |

Dashboard rules: totals cover **every** invoice matching the filters and branch scope, never a page. Cancelled invoices are excluded from all four figures but still count toward `hasNoRecords`. The filter implementation is shared with `GET /finance/invoices`, so a total can never cover a different set than the list it summarizes. Any money mutation invalidates this read.

## Error Catalogue

| Code | HTTP | When | Extra detail |
|---|---|---|---|
| `not-found` | 404 | Unknown invoice, payment, or refund | — |
| `forbidden` | 403 | Missing `finance.*` permission | — |
| `out-of-scope` | 403 | Record outside branch scope | — |
| `version-conflict` | 409 | Stale `expectedVersion` | `currentVersion` |
| `validation-failed` | 422 | Schema failure | `fieldErrors` |
| `invoice-immutable` | 409 | Editing a non-draft invoice | `fromStatus`, `allowed[]` |
| `invoice-not-payable` | 409 | Payment against a draft or cancelled invoice | `fromStatus` |
| `invoice-has-payments` | 409 | Cancelling an invoice that carries payments | `collected` |
| `payment-exceeds-balance` | 422 | Amount > invoice remaining | `remaining` |
| `installment-exceeds-remaining` | 422 | Amount > installment remaining | `remaining` |
| `payment-method-inactive` | 422 | Inactive method chosen | — |
| `payment-immutable` | 409 | Any attempt to modify a payment | — |
| `installments-not-permitted` | 422 | Offering kind disallows plans | — |
| `plan-has-payments` | 409 | Regenerating a plan with paid installments | — |
| `reduction-exceeds-limit` | 422 | Discount or scholarship over policy | `limit` |
| `reduction-below-collected` | 422 | Reduction below money already taken | `collected` |
| `negative-amount` | 422 | Amount ≤ 0 | — |
| `invalid-currency` | 422 | Currency mismatch across combined values | — |
| `invalid-date-range` | 422 | Future payment/refund date, inverted range, or payment before issue date | — |
| `refund-exceeds-payment` | 422 | Refund > refundable | `refundable` |
| `refund-requires-payment` | 422 | Refund without a payment | — |
| `duplicate-number` | 409 | Invoice or receipt number collision | — |
| `service-unavailable` | 503 | Retryable | — |

Only `service-unavailable` is retryable; the UI shows a Retry affordance for that code alone.
