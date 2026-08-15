import { Inject, Injectable } from '@nestjs/common';
import {
  CATALOG_PUBLIC_PORT,
  type CatalogPublicPort,
} from '../../catalog/types/catalog-public.port';
import {
  IAM_EMPLOYEE_REFERENCE_PORT,
  type EmployeeReferencePort,
} from '../../identity/types/employee-reference.port';
import {
  ORGANIZATION_MASTER_DATA_PORT,
  type OrganizationMasterDataPort,
} from '../../organization/types/organization-master-data.port';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import {
  PROGRAM_BATCHES_PUBLIC_PORT,
  type ProgramBatchesPublicPort,
} from '../../program-batches/types/program-batches-public.port';

@Injectable()
export class AdmissionsLookupsService {
  constructor(
    @Inject(CATALOG_PUBLIC_PORT) private readonly catalog: CatalogPublicPort,
    @Inject(PROGRAM_BATCHES_PUBLIC_PORT)
    private readonly batches: ProgramBatchesPublicPort,
    @Inject(ORGANIZATION_MASTER_DATA_PORT)
    private readonly organization: OrganizationMasterDataPort,
    @Inject(IAM_EMPLOYEE_REFERENCE_PORT)
    private readonly employees: EmployeeReferencePort,
    private readonly profile: OrganizationProfileService,
  ) {}

  async get() {
    const profile = await this.profile.get();
    const [
      branches,
      departments,
      leadSources,
      academicGrades,
      qualifications,
      employees,
      managers,
      offerings,
    ] = await Promise.all([
      this.organization.selectable('branch'),
      this.organization.selectable('department'),
      this.organization.selectableValues('lead-sources'),
      this.organization.selectableValues('academic-grades'),
      this.organization.selectableValues('qualifications'),
      this.employees.selectable(profile.organizationId),
      this.employees.selectable(profile.organizationId, { managerOnly: true }),
      this.catalog.selectable(),
    ]);
    const offeringRows = await Promise.all(
      offerings.map(async (offering) => {
        const [pricing, snapshot] = await Promise.all([
          this.catalog.pricing(offering.id),
          this.catalog.snapshot(offering.id),
        ]);
        // A product only accepts admissions at the branches it is assigned to,
        // and that rule is enforced on save. Publishing the assignments lets
        // the form offer the branches that will actually be accepted instead
        // of every branch in the organization.
        const assignments = Array.isArray(snapshot.branches)
          ? (snapshot.branches as Array<Record<string, unknown>>)
          : [];
        const branchIdsFor = (role: string): string[] =>
          assignments.flatMap((assignment) =>
            assignment?.role === role && typeof assignment.branchId === 'string'
              ? [assignment.branchId]
              : [],
          );
        return {
          id: offering.id,
          value: offering.id,
          label: offering.name,
          code: offering.code,
          kind: offering.productType.toLowerCase().replaceAll('_', '-'),
          status: offering.status.toLowerCase(),
          version: 1,
          price: pricing?.basePrice,
          registrationFees: pricing?.registrationFees,
          registrationBranchIds: branchIdsFor('REGISTRATION'),
          studyBranchIds: branchIdsFor('STUDY'),
        };
      }),
    );
    const batchRows = (
      await Promise.all(
        offerings
          .filter((offering) => offering.batchable)
          .map((offering) =>
            this.batches.selectableForProgram(
              offering.id,
              undefined,
              new Date().toISOString().slice(0, 10),
              1,
              100,
            ),
          ),
      )
    ).flatMap((page) => page.items);
    // A batch carries its own pricing, and the admission is filed against the
    // batch rather than the product. Without resolving the revision here the
    // selection panel has no figures to show and falls back to zero, which
    // reads as "this batch is free" rather than "not loaded".
    const batchPricing = new Map(
      (
        await Promise.all(
          batchRows.map(async (batch) => {
            const revision = await this.batches.resolveFinancialRevision(
              batch.id,
              batch.financialRevisionId,
            );
            return [batch.id, revision] as const;
          }),
        )
      ).filter(([, revision]) => revision !== null),
    );
    const option = (row: {
      id: string;
      label: string;
      active?: boolean;
      disabledReason?: string;
    }) => ({
      value: row.id,
      label: row.label,
      status: row.active === false ? 'inactive' : 'active',
      ...(row.disabledReason ? { disabledReason: row.disabledReason } : {}),
    });
    return {
      branches: branches.map(option),
      employees: employees.map(option),
      managers: managers.map(option),
      departments: departments.map(option),
      leadSources: leadSources.map(option),
      academicGrades: academicGrades.map(option),
      qualifications: qualifications.map(option),
      offerings: offeringRows,
      batches: batchRows.map((batch) => ({
        id: batch.id,
        programId: batch.programId,
        name: batch.name,
        code: batch.code,
        status: batch.status.toLowerCase().replaceAll('_', '-'),
        version: batch.version,
        availableSeats: batch.availableSeats,
        financialRevisionId: batch.financialRevisionId,
        price: batchPricing.get(batch.id)?.programPrice,
        registrationFees: batchPricing.get(batch.id)?.registrationFee,
      })),
      documentPolicy: { id: 'admissions-standard', policyVersion: 1 },
      currency: offeringRows.find((row) => row.price)?.price?.currency ?? 'EGP',
      precision: offeringRows.find((row) => row.price)?.price?.precision ?? 2,
      identityRules: {
        phonePattern: '^01\\d{9}$',
        nationalIdPattern: '^\\d{14}$',
        minorAgeThreshold: 18,
        minimumGraduationAge: 16,
      },
    };
  }
}
