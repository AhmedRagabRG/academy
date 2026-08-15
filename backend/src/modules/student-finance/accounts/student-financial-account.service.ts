import { Inject, Injectable } from '@nestjs/common';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import { FinanceAccountNotFoundException } from '../../../core/exceptions/student-finance.exceptions';
import { TransactionManager } from '../../../database/transaction.manager';
import { normalizeArabic } from '../../../shared/utils/arabic-normalize';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import {
  ORGANIZATION_SETTINGS_PORT,
  type OrganizationSettingsPort,
} from '../../organization/types/organization-settings.port';
import {
  FINANCE_EVENT_NAMES,
  financeEvent,
} from '../events/student-finance.events';
import {
  STUDENTS_ENROLLMENT_PORT,
  type FinanceEnrollmentRef,
  type StudentsEnrollmentPort,
} from '../types/students-enrollment.port';
import type { EnrollmentFinancialSnapshotInput } from '../types/student-finance.types';
import { StudentFinancialAccountRepository } from './student-financial-account.repository';

export interface ProvisionResult {
  accountId: string;
  created: boolean;
  snapshotsAdded: number;
}

/**
 * Owns the one-account-per-student rule and the immutable per-enrollment
 * financial snapshot.
 *
 * Finance never inserts, updates or reads a student row — it reacts to the
 * `student.created` signal and copies what it needs through the public port
 * (constitution Principle II).
 */
@Injectable()
export class StudentFinancialAccountService {
  constructor(
    private readonly repository: StudentFinancialAccountRepository,
    private readonly transactions: TransactionManager,
    private readonly events: DomainEventBus,
    private readonly profile: OrganizationProfileService,
    @Inject(ORGANIZATION_SETTINGS_PORT)
    private readonly settings: OrganizationSettingsPort,
    @Inject(STUDENTS_ENROLLMENT_PORT)
    private readonly students: StudentsEnrollmentPort,
  ) {}

  /**
   * Creates the account if absent and captures any enrollment snapshot not yet
   * held. Safe to call repeatedly: both steps are idempotent, so a replayed
   * event or a later enrollment reconciliation is a no-op for what already
   * exists.
   */
  async provision(
    studentId: string,
    actorId: string,
  ): Promise<ProvisionResult> {
    const student = await this.students.getStudent(studentId);
    if (!student) throw new FinanceAccountNotFoundException();

    const organization = await this.profile.get();
    // Currency and precision are organization settings, not profile fields.
    const financial = await this.settings.financialDefaults();
    const enrollments = await this.students.listEnrollments(studentId);

    const result = await this.transactions.runSerializable(async (tx) => {
      const account = await this.repository.provision(
        {
          organizationId: organization.organizationId,
          studentId: student.studentId,
          studentCode: student.studentCode,
          studentName: student.fullName,
          searchName: normalizeArabic(student.fullName),
          currency: financial.currency,
          precision: financial.precision,
          actorId,
        },
        tx,
      );
      const snapshotsAdded = await this.repository.addSnapshots(
        account.id,
        enrollments.map((enrollment) => this.toSnapshot(enrollment)),
        actorId,
        tx,
      );
      return {
        accountId: account.id,
        created: account.created,
        snapshotsAdded,
      };
    });

    // Emitted only after commit, and only when something actually changed.
    if (result.created) {
      this.events.emit(
        financeEvent(FINANCE_EVENT_NAMES.accountProvisioned, {
          actorId,
          targetType: 'finance-account',
          targetId: result.accountId,
          operation: 'provision',
          payload: { studentId: student.studentId },
        }),
      );
    }
    return result;
  }

  /** The account read every statement and invoice raise starts from. */
  async requireAccount(studentId: string) {
    const account = await this.repository.findByStudent(studentId);
    if (!account) throw new FinanceAccountNotFoundException();
    return account;
  }

  /** The owning account of a snapshot, resolved without a studentId detour. */
  async requireAccountById(accountId: string) {
    const account = await this.repository.findById(accountId);
    if (!account) throw new FinanceAccountNotFoundException();
    return account;
  }

  /**
   * The pricing source for raising an invoice. Read from Finance's own
   * immutable copy, never from a live catalog or batch lookup, so a later
   * price change cannot reach an existing enrollment.
   */
  async requireSnapshot(enrollmentId: string) {
    const snapshot = await this.repository.findSnapshot(enrollmentId);
    if (!snapshot) throw new FinanceAccountNotFoundException();
    return snapshot;
  }

  private toSnapshot(
    enrollment: FinanceEnrollmentRef,
  ): EnrollmentFinancialSnapshotInput {
    return {
      enrollmentId: enrollment.enrollmentId,
      offeringId: enrollment.offeringId,
      offeringKind: enrollment.offeringKind,
      offeringLabel: enrollment.offeringLabel,
      batchId: enrollment.batchId,
      batchLabel: enrollment.batchLabel,
      branchId: enrollment.branchId,
      sourceAdmissionId: enrollment.sourceAdmissionId,
      sourceApprovalSnapshotId: enrollment.sourceApprovalSnapshotId,
      sourceFinancialRevisionId: enrollment.financialRevisionId,
      tuitionMinor: BigInt(enrollment.tuitionMinor),
      registrationFeesMinor: BigInt(enrollment.registrationFeesMinor),
      admissionDiscountMinor: BigInt(enrollment.admissionDiscountMinor),
      requiredAmountMinor: BigInt(enrollment.requiredAmountMinor),
      currency: enrollment.currency,
      precision: enrollment.precision,
    };
  }
}
