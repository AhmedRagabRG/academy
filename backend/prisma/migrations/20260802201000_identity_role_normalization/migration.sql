ALTER TABLE "Role" ADD COLUMN "normalizedDisplayName" TEXT;
UPDATE "Role"
SET "normalizedDisplayName" = lower(
  translate(
    regexp_replace("displayName", '[ً-ٰٟ]', '', 'g'),
    'آأإٱىة٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹',
    'اااايه01234567890123456789'
  )
);
ALTER TABLE "Role" ALTER COLUMN "normalizedDisplayName" SET NOT NULL;
CREATE UNIQUE INDEX "Role_normalizedDisplayName_key" ON "Role"("normalizedDisplayName");
