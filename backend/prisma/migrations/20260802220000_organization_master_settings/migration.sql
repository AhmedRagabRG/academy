-- Explicit retained-term ordering. The constraint is deferred so interval shifts
-- can update a complete sequence without temporary invalid ranks.
ALTER TABLE "AcademicTerm" ADD COLUMN "order" INTEGER;

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "academicYearId"
    ORDER BY "startDate", "endDate", "id"
  )::INTEGER AS position
  FROM "AcademicTerm"
)
UPDATE "AcademicTerm" AS term
SET "order" = ranked.position
FROM ranked
WHERE term."id" = ranked."id";

ALTER TABLE "AcademicTerm" ALTER COLUMN "order" SET NOT NULL;
ALTER TABLE "AcademicTerm"
  ADD CONSTRAINT "AcademicTerm_order_positive" CHECK ("order" > 0);
ALTER TABLE "AcademicTerm"
  ADD CONSTRAINT "AcademicTerm_academicYearId_order_key"
  UNIQUE ("academicYearId", "order") DEFERRABLE INITIALLY DEFERRED;
