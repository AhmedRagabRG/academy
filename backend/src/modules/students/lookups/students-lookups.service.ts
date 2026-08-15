import { Inject, Injectable } from '@nestjs/common';
import {
  IAM_EMPLOYEE_REFERENCE_PORT,
  type EmployeeReferencePort,
} from '../../identity/types/employee-reference.port';
import {
  ORGANIZATION_MASTER_DATA_PORT,
  type OrganizationMasterDataPort,
  type OrganizationMasterDataOption,
} from '../../organization/types/organization-master-data.port';
import {
  ORGANIZATION_SETTINGS_PORT,
  type OrganizationSettingsPort,
} from '../../organization/types/organization-settings.port';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import { StudentDocumentPolicy } from '../documents/student-document.policy';
import { DocumentRequirementService } from '../../organization/document-requirements/document-requirement.service';
import type { StudentIdentityRules } from '../types/students.types';

export interface LookupChoice {
  value: string;
  label: string;
  active: boolean;
  disabledReason?: string;
}

/**
 * Identity rules are published here AND enforced by StudentIdentityPolicy —
 * the API must enforce exactly the values it advertises (FR-012).
 */
export const DEFAULT_STUDENT_IDENTITY_RULES: StudentIdentityRules = {
  nationalIdPattern: '^\\d{14}$',
  phonePattern: '^01\\d{9}$',
  minorAgeThreshold: 18,
  minimumGraduationAge: 16,
};

export const STUDENT_IMAGE_POLICY = {
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxBytes: 2 * 1024 * 1024,
};

const STATUS_LABELS: readonly LookupChoice[] = Object.freeze([
  { value: 'active', label: 'نشط', active: true },
  { value: 'suspended', label: 'موقوف', active: true },
  { value: 'graduated', label: 'متخرج', active: true },
  { value: 'withdrawn', label: 'منسحب', active: true },
  { value: 'archived', label: 'مؤرشف', active: true },
]);

@Injectable()
export class StudentsLookupsService {
  constructor(
    @Inject(ORGANIZATION_MASTER_DATA_PORT)
    private readonly organization: OrganizationMasterDataPort,
    @Inject(ORGANIZATION_SETTINGS_PORT)
    private readonly settings: OrganizationSettingsPort,
    @Inject(IAM_EMPLOYEE_REFERENCE_PORT)
    private readonly employees: EmployeeReferencePort,
    private readonly profile: OrganizationProfileService,
    private readonly documents: StudentDocumentPolicy,
    private readonly requirements: DocumentRequirementService,
  ) {}

  identityRules(): StudentIdentityRules {
    return DEFAULT_STUDENT_IDENTITY_RULES;
  }

  async all() {
    const profile = await this.profile.get();
    const [branches, departments, grades, qualifications, employees] =
      await Promise.all([
        this.organization.selectable('branch'),
        this.organization.selectable('department'),
        this.organization.selectableValues('academic-grades'),
        this.organization.selectableValues('qualifications'),
        this.employees.selectable(profile.organizationId),
      ]);

    return {
      branches: branches.map((row) => this.choice(row)),
      departments: departments.map((row) => this.choice(row)),
      academicGrades: grades.map((row) => this.choice(row)),
      qualifications: qualifications.map((row) => this.choice(row)),
      customerServiceEmployees: employees.map((row) => ({
        value: row.id,
        label: row.label,
        active: row.active,
        ...(row.active ? {} : { disabledReason: 'موظف غير مفعّل' }),
      })),
      statuses: STATUS_LABELS,
      documentTypes: await this.documentTypes(),
      identityRules: this.identityRules(),
      imagePolicy: STUDENT_IMAGE_POLICY,
      // Read, not assumed: this happened to match the configured currency, so
      // a change in Settings would have silently disagreed with the screens.
      ...(await this.settings.financialDefaults()),
    };
  }

  /**
   * Inactive choices stay identifiable so historical rows remain resolvable —
   * they are rendered but disabled, never dropped (FR-057).
   */

  /**
   * The configured student document types, falling back to the published
   * constants when the organization has no policy row yet. Reading them here
   * means Settings governs what the workspace asks for without a deployment.
   */
  private async documentTypes() {
    const policy = await this.requirements.resolve('students');
    const enabled = (policy?.requirements ?? []).filter((row) => row.enabled);
    if (!enabled.length) return this.documents.types();
    return enabled.map((row) => ({
      key: row.stableKey,
      label: row.label,
      required: row.required,
      multiple: row.multiple,
      allowedMimeTypes: row.allowedMimeTypes,
      maxBytes: row.maximumBytes,
    }));
  }

  private choice(row: OrganizationMasterDataOption): LookupChoice {
    return {
      value: row.id,
      label: row.label,
      active: row.active,
      ...(row.active
        ? {}
        : {
            disabledReason:
              row.disabledReason === 'archived' ? 'سجل مؤرشف' : 'سجل غير مفعّل',
          }),
    };
  }
}
