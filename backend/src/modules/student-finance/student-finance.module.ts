import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { AdmissionsModule } from '../admissions/admissions.module';
import { CatalogModule } from '../catalog/catalog.module';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationModule } from '../organization/organization.module';
import { ProgramBatchesModule } from '../program-batches/program-batches.module';
import { StudentsModule } from '../students/students.module';
import { StudentFinancialAccountRepository } from './accounts/student-financial-account.repository';
import { StudentFinancialAccountService } from './accounts/student-financial-account.service';
import { FinanceBalanceRepository } from './balances/finance-balance.repository';
import { FinanceBalanceService } from './balances/finance-balance.service';
import { FinanceMoneyPolicy } from './balances/finance-money.policy';
import { StudentsEnrollmentAdapter } from './integration/students-enrollment.adapter';
import { InvoiceDraftPolicy } from './invoices/invoice-draft.policy';
import { InvoiceLifecyclePolicy } from './invoices/invoice-lifecycle.policy';
import { InvoiceController } from './invoices/invoice.controller';
import { InvoiceRepository } from './invoices/invoice.repository';
import { InvoiceService } from './invoices/invoice.service';
import { InvoiceMapper } from './mappers/invoice.mapper';
import { FinanceNumberingService } from './numbering/finance-numbering.service';
import { FinancePermissionPolicy } from './policies/finance-permission.policy';
import { STUDENTS_ENROLLMENT_PORT } from './types/students-enrollment.port';
import { BranchScopeService } from '../../core/authorization/branch-scope.service';
import { InstallmentController } from './installments/installment.controller';
import { InstallmentRepository } from './installments/installment.repository';
import { InstallmentService } from './installments/installment.service';
import { InstallmentAllocationPolicy } from './installments/installment-allocation.policy';
import { InstallmentSchedulePolicy } from './installments/installment-schedule.policy';
import { PaymentController } from './payments/payment.controller';
import { PaymentRepository } from './payments/payment.repository';
import { PaymentService } from './payments/payment.service';
import { PaymentPolicy } from './payments/payment.policy';
import { PaymentMapper } from './mappers/payment.mapper';
import { ReductionController } from './reductions/reduction.controller';
import { ReductionRepository } from './reductions/reduction.repository';
import { ReductionService } from './reductions/reduction.service';
import { ReductionPolicy } from './reductions/reduction.policy';
import { RefundController } from './refunds/refund.controller';
import { RefundRepository } from './refunds/refund.repository';
import { RefundService } from './refunds/refund.service';
import { RefundLifecyclePolicy } from './refunds/refund-lifecycle.policy';
import { FinanceTimelineRepository } from './statements/finance-timeline.repository';
import { FinanceTimelineService } from './statements/finance-timeline.service';
import { StudentStatementController } from './statements/student-statement.controller';
import { StudentStatementService } from './statements/student-statement.service';
import { FinanceDashboardController } from './dashboard/finance-dashboard.controller';
import { FinanceDashboardService } from './dashboard/finance-dashboard.service';
import { FinanceLookupsController } from './lookups/finance-lookups.controller';
import { FinanceLookupsService } from './lookups/finance-lookups.service';
import { AccountingContextController } from './integration/accounting-context.controller';
import { FinanceAccountingService } from './integration/finance-accounting.service';
import { FinanceAccountingRepository } from './integration/finance-accounting.repository';
import { StudentStatementRepository } from './statements/student-statement.repository';
import { InvoiceExportService } from './invoices/invoice-export.service';
import { FINANCE_ACCOUNTING_PORT } from './types/finance-accounting.port';

/**
 * Student Finance owns invoices, installment plans, payments, reductions,
 * refunds, and the derived balances over them. It reaches Students,
 * Admissions, Catalog, Batches, Organization, and IAM only through their
 * public ports — no foreign repository is imported and no foreign table is
 * read (constitution Principle II).
 *
 * Controllers and the remaining services are registered as each user story
 * phase lands.
 */
@Module({
  imports: [
    CoreModule,
    IdentityModule,
    OrganizationModule,
    CatalogModule,
    ProgramBatchesModule,
    AdmissionsModule,
    StudentsModule,
  ],
  controllers: [
    InvoiceController,
    PaymentController,
    InstallmentController,
    ReductionController,
    RefundController,
    StudentStatementController,
    FinanceDashboardController,
    FinanceLookupsController,
    AccountingContextController,
  ],
  providers: [
    StudentFinancialAccountRepository,
    StudentFinancialAccountService,
    InvoiceRepository,
    InvoiceService,
    InvoiceDraftPolicy,
    InvoiceLifecyclePolicy,
    InvoiceMapper,
    FinanceBalanceRepository,
    FinanceBalanceService,
    FinanceMoneyPolicy,
    FinanceNumberingService,
    FinancePermissionPolicy,
    BranchScopeService,
    PaymentRepository,
    PaymentService,
    PaymentPolicy,
    PaymentMapper,
    InstallmentRepository,
    InstallmentService,
    InstallmentAllocationPolicy,
    InstallmentSchedulePolicy,
    ReductionRepository,
    ReductionService,
    ReductionPolicy,
    RefundRepository,
    RefundService,
    RefundLifecyclePolicy,
    FinanceTimelineRepository,
    FinanceTimelineService,
    StudentStatementService,
    StudentStatementRepository,
    FinanceAccountingRepository,
    FinanceDashboardService,
    FinanceLookupsService,
    FinanceAccountingService,
    InvoiceExportService,
    { provide: FINANCE_ACCOUNTING_PORT, useClass: FinanceAccountingService },
    {
      provide: STUDENTS_ENROLLMENT_PORT,
      useClass: StudentsEnrollmentAdapter,
    },
  ],
  exports: [
    FinanceBalanceService,
    FinanceMoneyPolicy,
    StudentFinancialAccountService,
    FINANCE_ACCOUNTING_PORT,
  ],
})
export class StudentFinanceModule {}
