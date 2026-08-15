import type { Money } from '../../../shared/types/money';
import type { OfferingKind } from './admissions.types';

export const ADMISSIONS_CATALOG_PORT = Symbol('ADMISSIONS_CATALOG_PORT');
export const ADMISSIONS_BATCH_PORT = Symbol('ADMISSIONS_BATCH_PORT');
export const ADMISSIONS_ORGANIZATION_PORT = Symbol(
  'ADMISSIONS_ORGANIZATION_PORT',
);
export const ADMISSIONS_EMPLOYEE_PORT = Symbol('ADMISSIONS_EMPLOYEE_PORT');
export const ADMISSIONS_STORAGE_PORT = Symbol('ADMISSIONS_STORAGE_PORT');

export interface AdmissionsOption {
  id: string;
  code?: string;
  label: string;
  active: boolean;
  disabledReason?: 'inactive' | 'archived' | 'not-eligible' | 'out-of-scope';
}

export interface AdmissionsPriceSnapshot {
  sourceId: string;
  sourceVersion: number;
  financialRevisionId?: string;
  productPrice: Money;
  registrationFees: Money;
}

export interface AdmissionOfferingReference extends AdmissionsOption {
  code: string;
  kind: OfferingKind;
  version: number;
  registrationBranchIds: readonly string[];
  studyBranchIds: readonly string[];
  price: AdmissionsPriceSnapshot;
  documentPolicyId: string;
  documentPolicyVersion: number;
}

export interface AdmissionsCatalogPort {
  resolveOffering(id: string): Promise<AdmissionOfferingReference | null>;
  offerings(search?: string): Promise<AdmissionOfferingReference[]>;
}

export interface AdmissionBatchReference extends AdmissionsOption {
  code: string;
  programId: string;
  version: number;
  registrationBranchIds: readonly string[];
  studyBranchIds: readonly string[];
  registrationOpen: boolean;
  availableSeats: number;
  academicYearId: string;
  price: AdmissionsPriceSnapshot;
}

export interface AdmissionsBatchPort {
  resolveBatch(id: string): Promise<AdmissionBatchReference | null>;
  batchesForProgram(programId: string): Promise<AdmissionBatchReference[]>;
}

export interface ApplicantIdentityRules {
  minorAge: number;
  minimumGraduationAge: number;
  nationalIdPattern?: string;
  phonePattern?: string;
}

export interface AdmissionsOrganizationPort {
  organizationId(): Promise<string>;
  resolve(
    kind: 'branch' | 'department',
    id: string,
  ): Promise<AdmissionsOption | null>;
  resolveLookup(
    kind: 'qualification' | 'lead-source' | 'academic-grade',
    id: string,
  ): Promise<AdmissionsOption | null>;
  identityRules(): Promise<ApplicantIdentityRules>;
  currency(): Promise<{ currency: string; precision: number }>;
}

export interface AdmissionEmployeeReference extends AdmissionsOption {
  organizationId: string;
  branchIds: readonly string[];
  departmentId?: string;
  assignmentEligible: boolean;
  managerEligible: boolean;
}

export interface AdmissionsEmployeePort {
  resolveEmployee(
    id: string,
    organizationId: string,
  ): Promise<AdmissionEmployeeReference | null>;
  employees(
    organizationId: string,
    search?: string,
  ): Promise<AdmissionEmployeeReference[]>;
}

export interface AdmissionStoredFile {
  fileId: string;
  originalName: string;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  byteSize: number;
  previewLocator?: string;
}

export interface AdmissionsStoragePort {
  store(input: {
    bytes: Uint8Array;
    originalName: string;
    declaredMimeType: string;
  }): Promise<AdmissionStoredFile>;
  removeCompensating(fileId: string): Promise<void>;
  read(fileId: string): Promise<Uint8Array>;
}
