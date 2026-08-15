ALTER TABLE "Account" ADD COLUMN "normalizedDisplayName" TEXT;

UPDATE "Account"
SET "normalizedDisplayName" = lower(
  translate(
    regexp_replace("displayName", '[ً-ٰٟ]', '', 'g'),
    'آأإٱىة٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹',
    'اااايه01234567890123456789'
  )
);

ALTER TABLE "Account" ALTER COLUMN "normalizedDisplayName" SET NOT NULL;
CREATE INDEX "Account_normalizedDisplayName_idx" ON "Account"("normalizedDisplayName");
