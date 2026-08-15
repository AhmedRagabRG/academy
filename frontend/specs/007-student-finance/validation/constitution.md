
---

# Final Gate Run — Student Finance (T198)

**Run**: 2026-08-01 | **Status**: PASS for the static gates; e2e collected, not executed

| Gate | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — 0 errors, 11 warnings |
| `npm run test` | PASS — 145 files, 1,095 tests |
| `npm run build` | PASS — all 7 finance routes compiled |
| `npm run test:e2e` | **Not executed** — 326 tests collect across 43 files, 114 of them Student Finance |

The 11 lint warnings are the pre-existing test fixture-import convention shared
with Admissions and Students; none is in this feature's source.

## What e2e "collected, not executed" means

`npx playwright test --list` resolves and type-checks every spec, so the three
journey suites, the axe suite, and the keyboard suite are syntactically valid and
their helpers resolve. Running them needs a dev server and a full browser matrix;
that run has not been performed in this session, so **no e2e result is claimed**.

To run them:

```bash
npm run test:e2e -w web
```

T199 (executing every quickstart scenario) depends on the same running
application and is likewise outstanding.

## Scale suite

`tests/unit/student-finance/finance-list-scale.test.ts` is part of `npm run test`
and passed within the run above. Its measured figures are recorded in
[performance.md](performance.md).
