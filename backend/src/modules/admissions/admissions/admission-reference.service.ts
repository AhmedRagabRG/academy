import { Inject, Injectable } from '@nestjs/common';
import {
  ProductStatus,
  ProductTypeIdentity,
} from '../../../../prisma/generated/client';
import {
  DependencyNotFoundException,
  ValidationException,
} from '../../../core/exceptions';
import type { Money } from '../../../shared/types/money';
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
import type {
  AdmissionAssignmentInputDto,
  AdmissionSelectionInputDto,
} from './dto/create-admission.dto';

export interface ResolvedAdmissionReferences {
  organizationId: string;
  offering: {
    id: string;
    kind: 'professional-program' | 'professional-diploma' | 'training-course';
    version: number;
    code: string;
    label: string;
    active: boolean;
    registrationBranchIds: string[];
    studyBranchIds: string[];
  };
  batch: null | {
    id: string;
    version: number;
    code: string;
    label: string;
    financialRevisionId: string;
    availableSeats: number;
    programPrice: Money;
    registrationFees: Money;
  };
  price: {
    sourceId: string;
    sourceVersion: number;
    financialRevisionId: string;
    productPrice: Money;
    registrationFees: Money;
  };
  labels: Record<string, string>;
}

@Injectable()
export class AdmissionReferenceService {
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

  async resolve(
    selection: AdmissionSelectionInputDto,
    assignment: AdmissionAssignmentInputDto,
  ): Promise<ResolvedAdmissionReferences> {
    const [profile, offering, snapshot, pricing] = await Promise.all([
      this.profile.get(),
      this.catalog.resolve(selection.offeringId),
      this.catalog.snapshot(selection.offeringId),
      this.catalog.pricing(selection.offeringId),
    ]);
    if (!offering || !pricing) throw new DependencyNotFoundException();
    if (offering.status !== ProductStatus.ACTIVE)
      throw new ValidationException([
        { field: 'selection.offeringId', message: 'المنتج المحدد غير نشط' },
      ]);
    const kind = this.kind(offering.productType);
    if (kind !== selection.offeringKind)
      throw new ValidationException([
        {
          field: 'selection.offeringKind',
          message: 'نوع المنتج لا يطابق المنتج المحدد',
        },
      ]);
    const registrationBranchIds = this.branchIds(snapshot, 'REGISTRATION');
    const studyBranchIds = this.branchIds(snapshot, 'STUDY');
    if (!registrationBranchIds.includes(assignment.registrationBranchId))
      throw new ValidationException([
        {
          field: 'assignment.registrationBranchId',
          message: 'فرع التسجيل غير متاح للمنتج المحدد',
        },
      ]);
    if (!studyBranchIds.includes(assignment.studyBranchId))
      throw new ValidationException([
        {
          field: 'assignment.studyBranchId',
          message: 'فرع الدراسة غير متاح للمنتج المحدد',
        },
      ]);
    const basePrice = pricing.basePrice;
    const registrationFees = pricing.registrationFees;
    if (!basePrice || !registrationFees)
      throw new DependencyNotFoundException();

    const refs = await Promise.all([
      this.organization.resolve('branch', assignment.registrationBranchId),
      this.organization.resolve('branch', assignment.studyBranchId),
      this.organization.resolve('department', assignment.departmentId),
      this.organization.resolveValue('lead-sources', assignment.leadSourceId),
      assignment.academicGradeId
        ? this.organization.resolveValue(
            'academic-grades',
            assignment.academicGradeId,
          )
        : Promise.resolve(null),
      this.employees.resolve(
        assignment.admissionsEmployeeId,
        profile.organizationId,
      ),
      this.employees.resolve(
        assignment.customerServiceEmployeeId,
        profile.organizationId,
      ),
      this.employees.resolve(
        assignment.customerServiceManagerId,
        profile.organizationId,
      ),
    ]);
    const [
      registrationBranch,
      studyBranch,
      department,
      leadSource,
      academicGrade,
      admissionsEmployee,
      customerServiceEmployee,
      customerServiceManager,
    ] = refs;
    const required = [
      registrationBranch,
      studyBranch,
      department,
      leadSource,
      admissionsEmployee,
      customerServiceEmployee,
      customerServiceManager,
    ];
    if (required.some((value) => !value || !value.active))
      throw new DependencyNotFoundException();
    if (
      !admissionsEmployee?.assignmentEligible ||
      !customerServiceEmployee?.assignmentEligible ||
      !customerServiceManager?.managerEligible
    )
      throw new ValidationException([
        { field: 'assignment', message: 'تعيين الموظفين غير صالح' },
      ]);

    let batch: ResolvedAdmissionReferences['batch'] = null;
    if (kind === 'professional-program') {
      if (!selection.batchId)
        throw new ValidationException([
          {
            field: 'selection.batchId',
            message: 'الدفعة مطلوبة للبرنامج المهني',
          },
        ]);
      const selected = await this.batches.snapshotForSelection(
        selection.batchId,
        assignment.registrationBranchId,
        new Date().toISOString().slice(0, 10),
      );
      if (selected.batch.programId !== offering.id)
        throw new ValidationException([
          {
            field: 'selection.batchId',
            message: 'الدفعة لا تتبع البرنامج المحدد',
          },
        ]);
      batch = {
        id: selected.batch.id,
        version: selected.batch.version,
        code: selected.batch.code,
        label: selected.batch.name,
        financialRevisionId: selected.financialRevision.id,
        availableSeats: selected.availableSeats,
        programPrice: selected.financialRevision.programPrice,
        registrationFees: selected.financialRevision.registrationFee,
      };
    } else if (selection.batchId) {
      throw new ValidationException([
        {
          field: 'selection.batchId',
          message: 'الدفعات غير مسموحة لهذا النوع',
        },
      ]);
    }

    return {
      organizationId: profile.organizationId,
      offering: {
        id: offering.id,
        kind,
        version: this.snapshotVersion(snapshot),
        code: offering.code,
        label: offering.name,
        active: offering.status === ProductStatus.ACTIVE,
        registrationBranchIds,
        studyBranchIds,
      },
      batch,
      price: batch
        ? {
            sourceId: batch.id,
            sourceVersion: batch.version,
            financialRevisionId: batch.financialRevisionId,
            productPrice: batch.programPrice,
            registrationFees: batch.registrationFees,
          }
        : {
            sourceId: offering.id,
            sourceVersion: this.snapshotVersion(snapshot),
            financialRevisionId: offering.id,
            productPrice: basePrice,
            registrationFees,
          },
      labels: {
        registrationBranch: registrationBranch?.label ?? '',
        studyBranch: studyBranch?.label ?? '',
        department: department?.label ?? '',
        leadSource: leadSource?.label ?? '',
        academicGrade: academicGrade?.label ?? '',
        admissionsEmployee: admissionsEmployee?.label ?? '',
        customerServiceEmployee: customerServiceEmployee?.label ?? '',
        customerServiceManager: customerServiceManager?.label ?? '',
      },
    };
  }

  private kind(
    value: ProductTypeIdentity,
  ): ResolvedAdmissionReferences['offering']['kind'] {
    if (value === ProductTypeIdentity.PROFESSIONAL_PROGRAM)
      return 'professional-program';
    if (value === ProductTypeIdentity.PROFESSIONAL_DIPLOMA)
      return 'professional-diploma';
    return 'training-course';
  }

  private branchIds(
    snapshot: Readonly<Record<string, unknown>>,
    role: string,
  ): string[] {
    // A catalog product snapshot names its assignments `branches`;
    // `branchAssignments` is the program-batch spelling. Reading the latter
    // here always yielded an empty list, so every branch failed the
    // availability check and no admission could be created at all.
    const rows = snapshot.branches;
    if (!Array.isArray(rows)) return [];
    return rows.flatMap((row) => {
      if (!row || typeof row !== 'object') return [];
      const value = row as Record<string, unknown>;
      return value.role === role && typeof value.branchId === 'string'
        ? [value.branchId]
        : [];
    });
  }

  private snapshotVersion(snapshot: Readonly<Record<string, unknown>>): number {
    return typeof snapshot.version === 'number' && snapshot.version >= 1
      ? snapshot.version
      : 1;
  }
}
