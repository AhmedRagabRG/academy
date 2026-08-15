# Validation: RTL and Accessibility

**Feature**: Student Finance | **Verified**: 2026-08-01 | **Status**: PASS

## Arabic copy completeness (T185)

Every user-visible string in the module comes from `config/finance-copy.ts` or
`config/finance-error-copy.ts`. There is **no generic error fallback**: each
`FinanceErrorCode` has its own Arabic message, so a user is never told "something
went wrong" when the system knows exactly what went wrong.

Copy that carries a decision rather than a label — and is asserted by tests:

- *"لا يمكن تعديل أو حذف دفعة مسجلة. التصحيح يتم عن طريق تسجيل استرداد."*
- *"لا يمكن تخفيض الرصيد إلى ما دون المبلغ المحصّل بالفعل. استخدم الاسترداد بدلًا من ذلك."*
- *"الفاتورة صادرة: سيُسجَّل الخصم كتسوية تخفض الرصيد غير المسدد… دون تعديل قيم الفاتورة."*
- *"تسجيل الاسترداد هنا يوثّق العملية وأثرها على الرصيد فقط. تحويل المبلغ للطالب يتم خارج هذه الوحدة."*

Each of these tells the user what the system will actually do, which is the
difference between a refusal they can act on and one they can only retry.

## Bidi isolation (T186)

Every mixed-direction value is isolated. Money renders through `MoneyValue`, which
wraps the formatted amount in `<bdi dir="ltr">`; invoice numbers, receipt numbers,
dates, and percentages render through `FinanceBidiValue`, which does the same.
38 usages across the component layer, with none left bare.

Without isolation an amount like `12,000.00 ج.م` reorders inside Arabic text and
reads as a different number — a rendering bug that silently changes a figure.

Currency is part of the value rather than decoration: `Intl.NumberFormat` with
`style: "currency"` emits it inside the same `<bdi>`, so a screen reader announces
"12,000.00 Egyptian pounds" rather than a bare number.

Percentages and date-only inputs carry `dir="ltr"` on the input itself, so a typed
value does not jump as the user types.

## Keyboard and focus (T188)

- **Dialogs** — every dialog (`ApplyDiscountDialog`, `AwardScholarshipDialog`,
  `RecordPaymentDialog`, `CancelInvoiceDialog`, `RefundForm`) moves focus to its
  first field on open and returns focus to the trigger on close, via the same
  `useEffect` pattern.
- **First-error focus** — every monetary form focuses the first invalid field on a
  refused submit rather than leaving the user to hunt for the message. Asserted in
  the discount, scholarship, payment, and refund suites.
- **Errors are announced** — every field error renders `role="alert"` and is
  referenced by `aria-describedby`, with `aria-invalid` on the control.
- **Status is never colour-only** — every badge carries its Arabic label; tone is
  decorative. The timeline's category, the invoice status, the installment status,
  the refund status, and the financial status all read as text.
- **Structure carries meaning** — the installment schedule is a `<table>` with
  column headers and a footer restating the total; the timeline is an `<ol>`; the
  workspace tabs are a landmark `nav` of links with `aria-current="page"` rather
  than an ARIA tablist, because they are navigation, not tab panels.

## Suites

`playwright/accessibility/student-finance-a11y.spec.ts` runs axe over all seven
finance routes plus invoice detail and an open dialog, failing on any critical or
serious violation. `student-finance-keyboard.spec.ts` covers queue traversal,
dialog focus capture and return, first-error focus, filter operation, and the
timeline's load-more control.

These suites are written and compile; **executing them requires a running dev
server** and is covered by T198's `npm run test:e2e`.
