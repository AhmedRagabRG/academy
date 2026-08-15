# Validation: RTL and Accessibility

**Feature**: Accounting | **Verified**: 2026-08-01 | **Status**: PASS on static review; axe run outstanding

## Arabic copy completeness (T171)

Every user-visible string comes from `config/accounting-copy.ts` or
`config/accounting-error-copy.ts`. There is **no generic error fallback**: each of
the 17 `AccountingErrorCode`s has its own Arabic message, so a user is never told
"something went wrong" when the system knows exactly what went wrong.

Copy that carries a decision rather than a label, and is asserted by test:

- *"لا يمكن تعديل الطلب بعد تقديمه. التعديل يتم بعد إعادته للتعديل من قسم المالية."* —
  names the route back rather than only refusing
- *"هذا التصنيف مؤرشف ولا يمكن اختياره في طلب جديد. اختر تصنيفًا نشطًا."*
- *"هذا الإجراء يوثّق أن السداد تم بالفعل خارج هذه الوحدة؛ لا يقوم النظام بتحويل أي مبلغ."* —
  the mark-paid notice, so nobody believes they are releasing funds
- *"سجل الاعتماد غير قابل للتعديل أو الحذف."*
- *"التعليقات للنقاش فقط ولا تُعدّ جزءًا من سجل الاعتماد."*

## Bidi isolation (T172)

**35 usages** of `AccountingBidiValue` / `<bdi dir="ltr">` across the feature —
every amount, request number, date, file size, attachment count, and percentage.

Without isolation a value like `4,500.00 ج.م` reorders inside Arabic text and
reads as a different number: a rendering bug that silently changes a displayed
figure. Money renders through `formatMoney`, so the currency is part of the value
rather than decoration and a screen reader announces it with the amount.

Date and decimal inputs carry `dir="ltr"` on the input itself, so a typed value
does not jump as the user types.

## Keyboard and focus (T174)

- **Four dialogs**, all verified: `CategoryDialog`, `request-action-dialogs`,
  `MarkPaidDialog`, `DecisionDialog`. Each captures focus on open and returns it
  to the trigger on close via the same `triggerRef` pattern.
- Dialogs are **mounted only while open**, so each opening starts with fresh state
  — a `setState` inside an effect was found and removed during Phase 4 because it
  triggered a cascading render on every open.
- **First-error focus** on every refused submit: the create screen, the detail
  screen's edit mode, and the category dialog each move focus to the first invalid
  field rather than leaving the user hunting.
- **8 `aria-invalid` bindings and 5 `role="alert"` regions**, each error wired to
  its control by `aria-describedby`.
- **Status is never colour-only.** Every badge carries its Arabic label; tone is
  decorative. The expense status, category status, and history action all read as
  text.
- **Structure carries meaning**: the approval timeline is an `<ol>`, each
  breakdown is a `<table>` with a `<caption>` and column headers, and the
  decorative chart beside it is `aria-hidden` so its figures are not announced
  twice or, worse, only visually.
- The timeline contains **no button at all**, so nothing implies an entry is
  editable.

## Every route distinguishes forbidden from empty (T169)

All six screens are permission-gated through `AccountingAreaState`, which renders
a forbidden state rather than an empty one. Empty states themselves distinguish
"nothing matched these filters" from "nothing exists", offering the clear-filters
control only in the first case.

## Suites — outstanding

`playwright/accessibility/accounting-a11y.spec.ts` and
`accounting-keyboard.spec.ts` (T182) are **not yet written**, and no axe run has
been performed. **SC-013 is unverified.** The review above is static: it reads the
source and the 610 unit/integration tests, which is not the same as running axe
against rendered pages.
