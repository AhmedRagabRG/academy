# Validation: Foundation (Phase 1 + money/policy core of Phase 2)

**Feature**: Student Finance | **Status**: in progress — 31 of 200 tasks complete

## Completed

### Phase 1 — Setup (T001–T010, all 10)

| Item | Where |
| --- | --- |
| Feature directories and public barrel | `features/student-finance/index.ts` |
| Route segment notes | `app/(workspace)/student-finance/README.md` |
| Arabic copy | `config/finance-copy.ts` |
| Per-code Arabic error copy, no generic fallback | `config/finance-error-copy.ts` |
| Sixteen permission keys | `config/finance-permissions.ts` |
| Navigation contribution + `finance` icon | `config/navigation.ts`, `shared/config/{foundation-navigation,icon-registry}.ts` |
| Mock role permissions | `features/auth/data/auth-fixtures.ts` |
| Money-handling rule recorded | `features/student-finance/README.md` |

### Phase 2 — Money engine and policy layer (T011–T017, T020–T027)

| Item | Where | Tests |
| --- | --- | --- |
| Shared money engine | `shared/utils/money.ts` | 27 |
| Branded identifiers and status unions | `types/common.ts` | — |
| Domain entities | `types/domain.ts` | — |
| Typed errors | `services/finance-error.ts` | — |
| Reduction ordering and floors | `utils/finance-reductions.ts` | 20 |
| Installment schedule and eligibility | `utils/finance-installments.ts` | 18 |
| Balance derivation | `utils/finance-balance.ts` | 22 |
| Status derivation | `utils/finance-status.ts` | 25 |
| Invoice and refund lifecycles, numbering | `utils/finance-lifecycle.ts`, `utils/finance-numbering.ts` | 27 |

**139 tests across 6 files**, all passing.

## Monetary correctness evidence

The money engine is the module's highest-risk component, so it is proven rather than
asserted:

- **Exactness**: `0.10 + 0.20` yields exactly `"0.30"`; 1000 repeated additions of
  `"0.01"` yield exactly `"10.00"`. All arithmetic runs in integer minor units.
- **Allocation**: `allocate()` is verified across **144 combinations** (6 awkward
  totals × 24 counts), each asserting the parts sum *exactly* to the input. It also
  asserts its own sum internally before returning, so a bug fails at the source.
- **Ordering determinism**: scholarship-then-discount is proven to differ from
  applying both to the original base (720.00 vs 700.00 on a 1000 base), so the
  documented order is observably the one implemented.
- **Floors**: no reduction can produce a negative final amount or drop the balance
  below the amount already collected.
- **Overdue boundary**: not past due at the exact due instant; past due one
  millisecond later. The clock is injected, never read ambiently.
- **Derivation cannot contradict records**: an invoice record claiming `issued`
  while fully paid still derives to `paid`.

## Regression found and fixed in Student Management

`tests/unit/students/student-list-scale.test.ts` began failing under full-suite load
— not from any finance change, but because each case runs 20 samples over a
20,000-record fixture and Vitest's 5-second default per-test timeout was acting as a
second, load-dependent budget. It passed in isolation and failed at 110 files.

Fixed by giving those cases an explicit 60-second harness timeout. The real
performance guard is unchanged: the p95 assertion inside each case still enforces the
2,000 ms budget.

## Gates

| Gate | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS (0 errors; 10 pre-existing warnings, all tests importing fixtures directly) |
| `npm run test` | PASS — **110 files, 535 tests** |

## Not yet started

Phase 2 remainder (T018–T019, T028–T052): projections, commands, list-query
normalization, scope, timeline paging, intake rules, all five Zod schemas, dependency
ports and adapters, the service interface, fixtures, the 50,000-invoice scale
generator, the mock adapter, the scenario controller, query keys, and the three
shared additions (workspace-tab registry, currency field, area states).

Phases 3–13 (T053–T200): all ten user stories and polish.
