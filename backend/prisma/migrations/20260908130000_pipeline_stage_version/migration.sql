-- Adds optimistic-concurrency support to PipelineStage, mirroring the
-- version column Pipeline already carries.
ALTER TABLE "PipelineStage" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Enforce the aggregate invariants even when multiple application instances
-- promote defaults or entry stages concurrently.
CREATE UNIQUE INDEX "Pipeline_organizationId_default_key"
  ON "Pipeline" ("organizationId")
  WHERE "isDefault" = true;

CREATE UNIQUE INDEX "PipelineStage_pipelineId_entry_key"
  ON "PipelineStage" ("pipelineId")
  WHERE "isEntry" = true;
