# Student Finance — module notes

## The money rule

**No floating-point operator ever touches a money value.**

A `Money` is `{ amount: string; currency: string; precision: number }` where `amount`
is a decimal string. Every operation goes through `@/shared/utils/money`, which
converts to integer minor units, computes with integers, and converts back.

```ts
// wrong — reintroduces drift
const total = Number(a.amount) + Number(b.amount)

// right
import { add } from "@/shared/utils/money"
const total = add(a, b)
```

`allocate(total, count)` asserts its parts sum exactly to the input before
returning, so an installment-splitting bug fails at the source rather than as a
one-piastre discrepancy discovered later in a balance.

## Balances are derived, never stored

Remaining balance, paid amount, invoice status beyond Draft/Issued/Cancelled,
installment status, and student financial status are all computed from records by
`utils/finance-balance.ts` and `utils/finance-status.ts`. Nothing writes a balance.

A stored balance is a second source of truth that eventually disagrees with the
records that produced it. Deriving guarantees the agreement spec SC-001 requires.

## Issued invoices freeze

`Invoice.issuedSnapshot` is written once, at issuance, and never again. A reduction
recorded after issuance becomes a `FinancialAdjustment`. Every derivation reads
snapshot **plus** adjustments, so the historical document stays intact while the
amount still owed reflects the concession.

## Dependency direction

`student-finance → students`. Student Management never imports Student Finance; the
finance reader is injected at the app composition root. Adding an import of
`@/features/student-finance` inside `@/features/students` would create a cycle.
