-- Correct finance rows created while the legacy fallback currency was SAR.
-- Amounts were sourced from EGP-denominated catalog/admission records; only
-- their currency label was captured incorrectly.

ALTER TABLE "StudentEnrollmentFinancialSnapshot"
DISABLE TRIGGER "StudentEnrollmentFinancialSnapshot_append_only";
ALTER TABLE "FinanceTimelineEvent"
DISABLE TRIGGER "FinanceTimelineEvent_append_only";
ALTER TABLE "Invoice"
DISABLE TRIGGER "Invoice_identity_immutable";
ALTER TABLE "Payment"
DISABLE TRIGGER "Payment_append_only";
ALTER TABLE "FinancialAdjustment"
DISABLE TRIGGER "FinancialAdjustment_append_only";

UPDATE "StudentFinancialAccount" account
SET currency = settings.currency
FROM "GeneralSettings" settings
WHERE settings."organizationId" = account."organizationId"
  AND account.currency IS DISTINCT FROM settings.currency;

UPDATE "StudentEnrollmentFinancialSnapshot" snapshot
SET currency = settings.currency
FROM "StudentFinancialAccount" account, "GeneralSettings" settings
WHERE snapshot."accountId" = account.id
  AND settings."organizationId" = account."organizationId"
  AND snapshot.currency IS DISTINCT FROM settings.currency;

UPDATE "Invoice" invoice
SET currency = settings.currency
FROM "GeneralSettings" settings
WHERE settings."organizationId" = invoice."organizationId"
  AND invoice.currency IS DISTINCT FROM settings.currency;

UPDATE "Payment" payment
SET currency = settings.currency
FROM "GeneralSettings" settings
WHERE settings."organizationId" = payment."organizationId"
  AND payment.currency IS DISTINCT FROM settings.currency;

UPDATE "Refund" refund
SET currency = settings.currency
FROM "GeneralSettings" settings
WHERE settings."organizationId" = refund."organizationId"
  AND refund.currency IS DISTINCT FROM settings.currency;

UPDATE "FinancialAdjustment" adjustment
SET currency = settings.currency
FROM "Invoice" invoice, "GeneralSettings" settings
WHERE adjustment."invoiceId" = invoice.id
  AND settings."organizationId" = invoice."organizationId"
  AND adjustment.currency IS DISTINCT FROM settings.currency;

UPDATE "FinanceTimelineEvent" event
SET currency = settings.currency
FROM "GeneralSettings" settings
WHERE settings."organizationId" = event."organizationId"
  AND event.currency IS NOT NULL
  AND event.currency IS DISTINCT FROM settings.currency;

ALTER TABLE "StudentEnrollmentFinancialSnapshot"
ENABLE TRIGGER "StudentEnrollmentFinancialSnapshot_append_only";
ALTER TABLE "FinanceTimelineEvent"
ENABLE TRIGGER "FinanceTimelineEvent_append_only";
ALTER TABLE "Invoice"
ENABLE TRIGGER "Invoice_identity_immutable";
ALTER TABLE "Payment"
ENABLE TRIGGER "Payment_append_only";
ALTER TABLE "FinancialAdjustment"
ENABLE TRIGGER "FinancialAdjustment_append_only";
