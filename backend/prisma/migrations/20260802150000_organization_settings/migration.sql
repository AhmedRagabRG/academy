CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TYPE "OrganizationContactType" AS ENUM ('EMAIL','PHONE');

CREATE TABLE "Organization" (
  "id" UUID PRIMARY KEY, "singletonKey" TEXT NOT NULL DEFAULT 'PRIMARY', "code" TEXT NOT NULL,
  "name" TEXT NOT NULL, "logo" JSONB, "favicon" JSONB, "cover" JSONB, "website" TEXT,
  "address" TEXT, "workingHours" JSONB NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ NOT NULL,
  "createdBy" UUID, "updatedBy" UUID,
  CONSTRAINT "Organization_singleton_check" CHECK ("singletonKey" = 'PRIMARY')
);
CREATE UNIQUE INDEX "Organization_singletonKey_key" ON "Organization"("singletonKey");
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");

CREATE TABLE "OrganizationContact" (
  "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "type" "OrganizationContactType" NOT NULL,
  "label" TEXT NOT NULL, "value" TEXT NOT NULL, "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "OrganizationContact_sort_check" CHECK ("sortOrder" >= 0),
  CONSTRAINT "OrganizationContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "OrganizationContact_organizationId_type_sortOrder_idx" ON "OrganizationContact"("organizationId","type","sortOrder");
CREATE UNIQUE INDEX "OrganizationContact_primary_key" ON "OrganizationContact"("organizationId","type") WHERE "isPrimary" = true;

CREATE TABLE "OrganizationSocialLink" (
  "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "platform" TEXT NOT NULL, "url" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "OrganizationSocialLink_sort_check" CHECK ("sortOrder" >= 0),
  CONSTRAINT "OrganizationSocialLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "OrganizationSocialLink_organizationId_sortOrder_idx" ON "OrganizationSocialLink"("organizationId","sortOrder");
CREATE UNIQUE INDEX "OrganizationSocialLink_organizationId_platform_key" ON "OrganizationSocialLink"("organizationId","platform");

CREATE TABLE "Branch" (
  "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "name" TEXT NOT NULL, "normalizedName" TEXT NOT NULL,
  "code" TEXT NOT NULL, "address" TEXT NOT NULL, "phone" TEXT NOT NULL, "email" TEXT NOT NULL,
  "managerId" UUID, "workingHours" TEXT NOT NULL, "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1, "archivedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ NOT NULL,
  "createdBy" UUID, "updatedBy" UUID,
  CONSTRAINT "Branch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Branch_organizationId_code_key" ON "Branch"("organizationId","code");
CREATE INDEX "Branch_organizationId_status_idx" ON "Branch"("organizationId","status");
CREATE INDEX "Branch_normalizedName_idx" ON "Branch"("normalizedName");
CREATE INDEX "Branch_updatedAt_idx" ON "Branch"("updatedAt");
CREATE INDEX "Branch_managerId_idx" ON "Branch"("managerId");

CREATE TABLE "Department" (
  "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "name" TEXT NOT NULL, "normalizedName" TEXT NOT NULL,
  "code" TEXT NOT NULL, "description" TEXT NOT NULL, "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1, "archivedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ NOT NULL,
  "createdBy" UUID, "updatedBy" UUID,
  CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Department_organizationId_code_key" ON "Department"("organizationId","code");
CREATE INDEX "Department_organizationId_status_idx" ON "Department"("organizationId","status");
CREATE INDEX "Department_normalizedName_idx" ON "Department"("normalizedName");
CREATE INDEX "Department_updatedAt_idx" ON "Department"("updatedAt");

CREATE TABLE "AcademicYear" (
  "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "name" TEXT NOT NULL, "normalizedName" TEXT NOT NULL,
  "code" TEXT NOT NULL, "startDate" DATE NOT NULL, "endDate" DATE NOT NULL,
  "status" "EntityStatus" NOT NULL DEFAULT 'INACTIVE', "version" INTEGER NOT NULL DEFAULT 1,
  "archivedAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL, "createdBy" UUID, "updatedBy" UUID,
  CONSTRAINT "AcademicYear_dates_check" CHECK ("endDate" >= "startDate"),
  CONSTRAINT "AcademicYear_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AcademicYear_organizationId_code_key" ON "AcademicYear"("organizationId","code");
CREATE UNIQUE INDEX "AcademicYear_one_active_key" ON "AcademicYear"("organizationId") WHERE "status" = 'ACTIVE' AND "archivedAt" IS NULL;
CREATE INDEX "AcademicYear_organizationId_status_idx" ON "AcademicYear"("organizationId","status");
CREATE INDEX "AcademicYear_startDate_idx" ON "AcademicYear"("startDate");
CREATE INDEX "AcademicYear_normalizedName_idx" ON "AcademicYear"("normalizedName");

CREATE TABLE "AcademicTerm" (
  "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "academicYearId" UUID NOT NULL,
  "name" TEXT NOT NULL, "normalizedName" TEXT NOT NULL, "startDate" DATE NOT NULL, "endDate" DATE NOT NULL,
  "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE', "version" INTEGER NOT NULL DEFAULT 1,
  "archivedAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL, "createdBy" UUID, "updatedBy" UUID,
  CONSTRAINT "AcademicTerm_dates_check" CHECK ("endDate" >= "startDate"),
  CONSTRAINT "AcademicTerm_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AcademicTerm_no_overlap" EXCLUDE USING gist ("academicYearId" WITH =, daterange("startDate","endDate",'[]') WITH &&)
);
CREATE INDEX "AcademicTerm_academicYearId_status_startDate_idx" ON "AcademicTerm"("academicYearId","status","startDate");
CREATE INDEX "AcademicTerm_organizationId_idx" ON "AcademicTerm"("organizationId");
CREATE INDEX "AcademicTerm_normalizedName_idx" ON "AcademicTerm"("normalizedName");
CREATE INDEX "AcademicTerm_updatedAt_idx" ON "AcademicTerm"("updatedAt");

CREATE TABLE "LookupGroup" (
  "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL, "parentGroupId" UUID, "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1, "archivedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ NOT NULL,
  "createdBy" UUID, "updatedBy" UUID,
  CONSTRAINT "LookupGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LookupGroup_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "LookupGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LookupGroup_organizationId_code_key" ON "LookupGroup"("organizationId","code");
CREATE UNIQUE INDEX "LookupGroup_organizationId_normalizedName_key" ON "LookupGroup"("organizationId","normalizedName");
CREATE INDEX "LookupGroup_organizationId_status_idx" ON "LookupGroup"("organizationId","status");
CREATE INDEX "LookupGroup_parentGroupId_idx" ON "LookupGroup"("parentGroupId");

CREATE TABLE "LookupValue" (
  "id" UUID PRIMARY KEY, "lookupGroupId" UUID NOT NULL, "parentValueId" UUID, "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL, "code" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE', "version" INTEGER NOT NULL DEFAULT 1,
  "archivedAt" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL, "createdBy" UUID, "updatedBy" UUID,
  CONSTRAINT "LookupValue_sort_check" CHECK ("sortOrder" >= 0),
  CONSTRAINT "LookupValue_lookupGroupId_fkey" FOREIGN KEY ("lookupGroupId") REFERENCES "LookupGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LookupValue_parentValueId_fkey" FOREIGN KEY ("parentValueId") REFERENCES "LookupValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LookupValue_lookupGroupId_code_key" ON "LookupValue"("lookupGroupId","code");
CREATE UNIQUE INDEX "LookupValue_lookupGroupId_normalizedName_key" ON "LookupValue"("lookupGroupId","normalizedName");
CREATE INDEX "LookupValue_lookupGroupId_status_sortOrder_idx" ON "LookupValue"("lookupGroupId","status","sortOrder");
CREATE INDEX "LookupValue_parentValueId_idx" ON "LookupValue"("parentValueId");

CREATE TABLE "GeneralSettings" (
  "id" UUID PRIMARY KEY, "organizationId" UUID NOT NULL, "defaultLanguage" TEXT NOT NULL,
  "timeZone" TEXT NOT NULL, "currency" TEXT NOT NULL, "dateFormat" TEXT NOT NULL,
  "numberFormat" TEXT NOT NULL, "workingDays" TEXT[], "defaultBranchId" UUID NOT NULL,
  "defaultAcademicYearId" UUID NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ NOT NULL,
  "createdBy" UUID, "updatedBy" UUID,
  CONSTRAINT "GeneralSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GeneralSettings_defaultBranchId_fkey" FOREIGN KEY ("defaultBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "GeneralSettings_defaultAcademicYearId_fkey" FOREIGN KEY ("defaultAcademicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GeneralSettings_organizationId_key" ON "GeneralSettings"("organizationId");
CREATE INDEX "GeneralSettings_defaultBranchId_idx" ON "GeneralSettings"("defaultBranchId");
CREATE INDEX "GeneralSettings_defaultAcademicYearId_idx" ON "GeneralSettings"("defaultAcademicYearId");
