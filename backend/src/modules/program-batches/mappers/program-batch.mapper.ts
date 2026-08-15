import type { Prisma } from '../../../../prisma/generated/client';
import { fromMinorUnits } from '../../../shared/utils/money.util';
import type { CallerContext } from '../../../shared/types/caller-context';
import type { ProductPublicRecord } from '../../catalog/types/catalog.types';
import type { OrganizationMasterDataOption } from '../../organization/types/organization-master-data.port';
import { batchInclude } from '../batches/batch.repository';
import type {
  CapacityView,
  ImmutableFinancialRevision,
} from '../types/program-batch.types';

export type BatchAggregate = Prisma.ProgramBatchGetPayload<{
  include: typeof batchInclude;
}>;
export type FinancialRevisionAggregate =
  Prisma.BatchFinancialRevisionGetPayload<{
    include: {
      installmentPlans: { include: { installments: true } };
      offers: true;
    };
  }>;

const dateOnly = (value: Date | null): string | null =>
  value ? value.toISOString().slice(0, 10) : null;
const apiStatus = (value: string): string =>
  value.toLowerCase().replaceAll('_', '-');

export function mapFinancialRevision(row: FinancialRevisionAggregate) {
  return {
    id: row.id,
    revisionNumber: row.revisionNumber,
    programPrice: fromMinorUnits(
      row.programPriceMinor,
      row.programPriceCurrency,
      row.programPricePrecision,
    ),
    registrationFee: fromMinorUnits(
      row.registrationFeeMinor,
      row.registrationFeeCurrency,
      row.registrationFeePrecision,
    ),
    installmentsEnabled: row.installmentsEnabled,
    installmentPlans: row.installmentPlans.map((plan) => ({
      id: plan.externalId,
      name: plan.name,
      basis: apiStatus(plan.basis),
      coveredCharge: apiStatus(plan.coveredCharge),
      status: apiStatus(plan.status),
      position: plan.position,
      installments: plan.installments.map((item) => ({
        id: item.externalId,
        label: item.label,
        value: fromMinorUnits(item.valueMinor, '', item.valuePrecision).amount,
        milestone: item.milestone,
        position: item.position,
      })),
    })),
    offers: row.offers.map((offer) => ({
      id: offer.externalId,
      kind: apiStatus(offer.kind),
      name: offer.name,
      valueType: apiStatus(offer.valueType),
      value: fromMinorUnits(
        offer.valueMinor,
        offer.currency ?? '',
        offer.valuePrecision,
      ).amount,
      precision: offer.valuePrecision,
      currency: offer.currency ?? undefined,
      startDate: dateOnly(offer.startDate),
      endDate: dateOnly(offer.endDate),
      status: apiStatus(offer.status),
      position: offer.position,
    })),
    sourceBatchVersion: row.sourceBatchVersion,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
  };
}

export function mapImmutableRevision(
  row: FinancialRevisionAggregate,
): ImmutableFinancialRevision {
  return {
    id: row.id,
    batchId: row.batchId,
    revisionNumber: row.revisionNumber,
    programPrice: fromMinorUnits(
      row.programPriceMinor,
      row.programPriceCurrency,
      row.programPricePrecision,
    ),
    registrationFee: fromMinorUnits(
      row.registrationFeeMinor,
      row.registrationFeeCurrency,
      row.registrationFeePrecision,
    ),
    installmentsEnabled: row.installmentsEnabled,
    sourceBatchVersion: row.sourceBatchVersion,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapProgramBatch(
  row: BatchAggregate,
  capacity: CapacityView,
  references: {
    program: ProductPublicRecord;
    academicYear: OrganizationMasterDataOption;
    intake: OrganizationMasterDataOption;
    branches: ReadonlyMap<string, OrganizationMasterDataOption>;
  },
  caller?: CallerContext,
) {
  const revision = row.currentFinancialRevision;
  return {
    id: row.id,
    organizationId: row.organizationId,
    programId: row.programId,
    program: {
      id: references.program.id,
      code: references.program.code,
      label: references.program.name,
    },
    name: { ar: row.nameAr, ...(row.nameEn ? { en: row.nameEn } : {}) },
    code: row.code,
    academicYearId: row.academicYearId,
    academicYear: {
      id: references.academicYear.id,
      code: references.academicYear.code,
      label: references.academicYear.label,
      active: references.academicYear.active,
    },
    intakeId: row.intakeId,
    intake: {
      id: references.intake.id,
      code: references.intake.code,
      label: references.intake.label,
      active: references.intake.active,
    },
    description: row.description,
    schedule: {
      registrationStartDate: dateOnly(row.registrationStartDate),
      registrationEndDate: dateOnly(row.registrationEndDate),
      studyStartDate: dateOnly(row.studyStartDate),
      studyEndDate: dateOnly(row.studyEndDate),
      graduationDate: dateOnly(row.graduationDate),
    },
    capacity: { ...capacity, status: apiStatus(capacity.status) },
    branchAssignments: row.branches.map((item) => ({
      branchId: item.branchId,
      role: apiStatus(item.role),
      branch: {
        id: item.branchId,
        code: references.branches.get(item.branchId)?.code,
        label: references.branches.get(item.branchId)?.label ?? item.branchId,
        active: references.branches.get(item.branchId)?.active ?? false,
      },
    })),
    financialProfile: revision ? mapFinancialRevision(revision) : null,
    status: apiStatus(row.status),
    lifecycle: row.lifecycle.map((event) => ({
      id: event.id,
      fromStatus: event.fromStatus ? apiStatus(event.fromStatus) : null,
      toStatus: apiStatus(event.toStatus),
      reason: event.reason,
      actorId: event.actorId,
      occurredAt: event.occurredAt.toISOString(),
      resultVersion: event.resultingVersion,
    })),
    codeLockedAt: row.codeLockedAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    version: row.version,
    permissions: caller
      ? {
          update:
            caller.permissionKeys.includes('batches.update') &&
            row.status !== 'ARCHIVED',
          archive:
            caller.permissionKeys.includes('batches.archive') &&
            row.status !== 'ARCHIVED',
          manageCapacity: caller.permissionKeys.includes(
            'batches.capacity.manage',
          ),
          managePricing: caller.permissionKeys.includes(
            'batches.pricing.manage',
          ),
          manageBranches: caller.permissionKeys.includes(
            'batches.branches.manage',
          ),
        }
      : undefined,
  };
}
