# Validation: Permission Coverage

**Verified**: 2026-08-01 | Answers "are all permissions handled?" across both modules.

## 006 Student Management — fully handled

| Aspect | Count | Evidence |
| --- | --- | --- |
| Keys declared | 15 | `features/students/config/students-permissions.ts` |
| Keys seeded in the mock role | 15 | `features/auth/data/auth-fixtures.ts` |
| Service enforcement points | 17 | `require(context, studentsPermissions.…)` in `mock-students-service.ts` |
| UI / route gate files | 10 | `features/students/{components,screens}` |
| Keys with negative test coverage | **15 of 15** | every key appears in a `withoutPermissions([…])` case |

## 007 Student Finance — now enforced

| Aspect | Count | Evidence |
| --- | --- | --- |
| Keys declared | 16 | `features/student-finance/config/finance-permissions.ts` |
| Keys seeded in the mock role | 16 | `features/auth/data/auth-fixtures.ts` |
| Service enforcement points | 16 | `require(context, financePermissions.…)` plus transition-rule permissions |
| Keys with negative test coverage | **16 of 16** | `tests/contract/student-finance/finance-permissions.test.ts` — 26 cases |
| UI / route gates | **0 — not yet built** | Phases 3–12 are outstanding |

### Segregation of duties

The module's central financial control is that collecting money is not the same
authority as authorizing a concession. Four separate keys, each independently
tested:

| Action | Key |
| --- | --- |
| Record a payment | `finance.payments.record` |
| Approve a discount | `finance.discounts.approve` |
| Approve a scholarship | `finance.scholarships.approve` |
| Request a refund | `finance.refunds.record` |
| **Approve** a refund | `finance.refunds.approve` |

Two positive-path cases prove the separation actually holds rather than merely
existing:

- "lets a user record a payment while being unable to approve a discount"
- "lets a user request a refund while being unable to approve one"

### Branch scope enforced alongside permissions

Three cases confirm that holding a permission is not sufficient — the record must
also be inside the user's authorized branches: out-of-scope invoices vanish from
the list, direct access returns `out-of-scope`, and export emits only in-scope rows.

## Honest gap

Student Finance has **no route or UI gating yet**, because no screens exist.
Every finance permission is enforced at the service, which is the authoritative
layer, but the affordance-level gating (hiding a button a user cannot use) lands
with the screens in Phases 3–12.

A note on ordering: `decideRefund` evaluates the status transition before the
permission, so attempting to approve an already-completed refund without the
permission reports `validation-failed` rather than `forbidden`. That is
deliberate — the transition is invalid for everyone, so it is not a permission
fact — but it is worth knowing when reading refusal codes.
