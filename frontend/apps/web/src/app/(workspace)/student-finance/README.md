# Student Finance route segment

Route pages here are thin Server Components. They await Next.js 16 promise-based
`params`, validate identifiers, and render a feature screen from
`@/features/student-finance`. They never read fixtures, permissions, or service
data directly.

## Segments

| Path | Screen | Permission |
| --- | --- | --- |
| `/student-finance` | `FinanceDashboardScreen` | `finance.view` |
| `/student-finance/invoices` | `InvoicesScreen` | `finance.invoices.view` (export also `finance.export`) |
| `/student-finance/invoices/create` | `CreateInvoiceScreen` | `finance.invoices.create` |
| `/student-finance/invoices/[invoiceId]` | `InvoiceDetailScreen` | `finance.invoices.view` plus per-section keys |
| `/student-finance/payments` | `PaymentsScreen` | `finance.payments.view` |
| `/student-finance/installments` | `InstallmentsScreen` | `finance.invoices.view` |
| `/student-finance/refunds` | `RefundsScreen` | `finance.refunds.view` |

## The per-student financial workspace lives elsewhere

There is deliberately **no** `/student-finance/students/[studentId]` route.

Student Management already owns a permission-filtered student workspace, and a
second student page would split the record across two competing locations. The
per-student financial view is `/students/[studentId]/finance`, contributed through
the shared workspace-tab registry (`shared/config/student-workspace-tabs.ts`) so
Student Management never has to know that finance exists.

## Segregation of duties

Recording a payment, approving a discount, approving a scholarship, and approving a
refund are four separate permissions. Route-level gating is a UX affordance only —
the service performs the authoritative check on every operation.
