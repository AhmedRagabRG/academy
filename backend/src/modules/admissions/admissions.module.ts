import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { StorageModule } from '../../storage/storage.module';
import { CatalogModule } from '../catalog/catalog.module';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationModule } from '../organization/organization.module';
import { ProgramBatchesModule } from '../program-batches/program-batches.module';
import { AdmissionController } from './admissions/admission.controller';
import { AdmissionExportService } from './admissions/admission-export.service';
import { AdmissionFinancialPolicy } from './admissions/admission-financial.policy';
import { AdmissionLifecycleService } from './admissions/admission-lifecycle.service';
import { AdmissionPolicy } from './admissions/admission.policy';
import { AdmissionReferenceService } from './admissions/admission-reference.service';
import { AdmissionRepository } from './admissions/admission.repository';
import { AdmissionSelectionPolicy } from './admissions/admission-selection.policy';
import { AdmissionService } from './admissions/admission.service';
import { AdmissionsOrganizationAdapter } from './admissions/admissions-organization.adapter';
import { ApplicantController } from './applicants/applicant.controller';
import { ApplicantPolicy } from './applicants/applicant.policy';
import { ApplicantRepository } from './applicants/applicant.repository';
import { ApplicantService } from './applicants/applicant.service';
import {
  AdmissionDocumentPolicyService,
  AdmissionDocumentPolicySource,
} from './documents/admission-document-policy.service';
import { AdmissionDocumentController } from './documents/admission-document.controller';
import {
  AdmissionDocumentRepository,
  PrismaAdmissionDocumentRepository,
} from './documents/admission-document.repository';
import { AdmissionDocumentService } from './documents/admission-document.service';
import { AdmissionsDocumentReadService } from './documents/admissions-document-read.service';
import { CurrentAdmissionDocumentPolicySource } from './documents/current-admission-document-policy.source';
import { AdmissionsLookupsService } from './lookups/admissions-lookups.service';
import { AdmissionReadinessService } from './readiness/admission-readiness.service';
import { AdmissionsEnrollmentService } from './readiness/admissions-enrollment.service';
import { ADMISSIONS_DOCUMENT_READ_PORT } from './types/admissions-document-read.port';
import { ADMISSIONS_ENROLLMENT_PORT } from './types/admissions-enrollment.port';
import { ADMISSIONS_ORGANIZATION_PORT } from './types/admissions-reference.port';

@Module({
  imports: [
    CoreModule,
    StorageModule,
    IdentityModule,
    OrganizationModule,
    CatalogModule,
    ProgramBatchesModule,
  ],
  controllers: [
    AdmissionController,
    ApplicantController,
    AdmissionDocumentController,
  ],
  providers: [
    ApplicantRepository,
    ApplicantPolicy,
    ApplicantService,
    AdmissionRepository,
    AdmissionFinancialPolicy,
    AdmissionSelectionPolicy,
    AdmissionPolicy,
    AdmissionReferenceService,
    AdmissionService,
    AdmissionExportService,
    AdmissionReadinessService,
    AdmissionLifecycleService,
    AdmissionsEnrollmentService,
    AdmissionsOrganizationAdapter,
    AdmissionsLookupsService,
    PrismaAdmissionDocumentRepository,
    {
      provide: AdmissionDocumentRepository,
      useExisting: PrismaAdmissionDocumentRepository,
    },
    CurrentAdmissionDocumentPolicySource,
    {
      provide: AdmissionDocumentPolicySource,
      useExisting: CurrentAdmissionDocumentPolicySource,
    },
    AdmissionDocumentPolicyService,
    AdmissionDocumentService,
    AdmissionsDocumentReadService,
    {
      provide: ADMISSIONS_ORGANIZATION_PORT,
      useExisting: AdmissionsOrganizationAdapter,
    },
    {
      provide: ADMISSIONS_ENROLLMENT_PORT,
      useExisting: AdmissionsEnrollmentService,
    },
    {
      provide: ADMISSIONS_DOCUMENT_READ_PORT,
      useExisting: AdmissionsDocumentReadService,
    },
  ],
  exports: [ADMISSIONS_ENROLLMENT_PORT, ADMISSIONS_DOCUMENT_READ_PORT],
})
export class AdmissionsModule {}
