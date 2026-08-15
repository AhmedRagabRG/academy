/*
  Removes the product landing-page URL along with the marketing section that
  collected it. The column held no values in any environment it shipped to.

  Scoped deliberately to that one column: the migration Prisma generated also
  dropped and re-created seven unchanged foreign keys and removed database
  defaults on ProgramBatch.id, ProgramBatch.updatedAt,
  BatchFinancialRevision.id and BatchLifecycleEvent.id. That drift predates
  this change and is not part of it.
*/
-- Only drop column if table exists (defensive for partial migrations)
DO $$ BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'AcademicProduct'
  ) THEN
    ALTER TABLE "AcademicProduct" DROP COLUMN IF EXISTS "landingPage";
  END IF;
END $$;
