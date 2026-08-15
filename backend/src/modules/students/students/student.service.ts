import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import {
  StudentNotFoundException,
  StudentVersionConflictException,
} from '../../../core/exceptions/students.exceptions';
import { TransactionManager } from '../../../database/transaction.manager';
import {
  createPageResult,
  normalizePageQuery,
} from '../../../shared/pagination/pagination.helper';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  normalizeArabic,
  normalizeDigits,
} from '../../../shared/utils/arabic-normalize';
import {
  IAM_EMPLOYEE_REFERENCE_PORT,
  type EmployeeReferencePort,
} from '../../identity/types/employee-reference.port';
import {
  ORGANIZATION_MASTER_DATA_PORT,
  type OrganizationMasterDataPort,
} from '../../organization/types/organization-master-data.port';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import { StudentDocumentPolicy } from '../documents/student-document.policy';
import { STUDENT_EVENT_NAMES, studentEvent } from '../events/students.events';
import { StudentLifecyclePolicy } from '../lifecycle/student-lifecycle.policy';
import { StudentsLookupsService } from '../lookups/students-lookups.service';
import { StudentMapper, type ActiveLookup } from '../mappers/student.mapper';
import { StudentTimelineService } from '../timeline/student-timeline.service';
import type { ListStudentsDto } from './dto/list-students.dto';
import type { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { StudentIdentityPolicy } from './student-identity.policy';
import { StudentPolicy } from './student.policy';
import { StudentRepository } from './student.repository';

const STATUS_TO_PRISMA = {
  active: 'ACTIVE',
  suspended: 'SUSPENDED',
  graduated: 'GRADUATED',
  withdrawn: 'WITHDRAWN',
  archived: 'ARCHIVED',
} as const;

@Injectable()
export class StudentService {
  constructor(
    private readonly repository: StudentRepository,
    private readonly policy: StudentPolicy,
    private readonly identity: StudentIdentityPolicy,
    private readonly lifecycle: StudentLifecyclePolicy,
    private readonly documents: StudentDocumentPolicy,
    private readonly mapper: StudentMapper,
    private readonly timeline: StudentTimelineService,
    private readonly lookups: StudentsLookupsService,
    private readonly transactions: TransactionManager,
    private readonly profile: OrganizationProfileService,
    private readonly events: DomainEventBus,
    @Inject(ORGANIZATION_MASTER_DATA_PORT)
    private readonly organization: OrganizationMasterDataPort,
    @Inject(IAM_EMPLOYEE_REFERENCE_PORT)
    private readonly employees: EmployeeReferencePort,
  ) {}

  private organizationId(): Promise<string> {
    return this.profile.get().then((profile) => profile.organizationId);
  }

  async list(caller: CallerContext, query: ListStudentsDto) {
    const organizationId = await this.organizationId();
    const paging = normalizePageQuery({
      ...(query.page !== undefined ? { page: query.page } : {}),
      ...(query.pageSize !== undefined ? { pageSize: query.pageSize } : {}),
    });

    const statuses = query.statuses?.map(
      (status) => STATUS_TO_PRISMA[status],
    ) as Prisma.StudentWhereInput['status'][] | undefined;

    const { rows, total } = await this.repository.list(
      {
        organizationId,
        ...(query.search ? { search: this.foldSearch(query.search) } : {}),
        ...(query.branchIds ? { branchIds: query.branchIds } : {}),
        ...(query.departmentIds ? { departmentIds: query.departmentIds } : {}),
        ...(query.offeringIds ? { offeringIds: query.offeringIds } : {}),
        ...(query.batchIds ? { batchIds: query.batchIds } : {}),
        ...(statuses ? { statuses } : {}),
        ...(query.customerServiceEmployeeIds
          ? { customerServiceEmployeeIds: query.customerServiceEmployeeIds }
          : {}),
        scope: this.policy.scopeFilter(caller),
        includeArchived: Boolean(query.statuses?.includes('archived')),
      },
      {
        field: query.sortBy ?? 'updatedAt',
        direction: query.sortOrder === 'asc' ? 'asc' : 'desc',
      },
      {
        skip: (paging.page - 1) * paging.pageSize,
        take: paging.pageSize,
      },
    );

    return createPageResult(
      rows.map((row) => this.mapper.listRow(row)),
      total,
      paging,
    );
  }

  /**
   * Search terms are folded exactly as the stored `searchName` was, so an
   * Arabic name typed with a different letter form still matches (FR-020).
   */
  private foldSearch(term: string): string {
    return normalizeArabic(normalizeDigits(term.trim())).toLowerCase();
  }

  async getDetail(caller: CallerContext, studentId: string) {
    const organizationId = await this.organizationId();
    const student = await this.repository.findDetail(studentId, organizationId);
    if (!student) throw new StudentNotFoundException();
    this.policy.assertInScope(caller, student);

    const isActive = await this.actorLookup(organizationId, [
      student.createdById,
      student.updatedById,
      ...student.statusHistory.map((entry) => entry.actorId),
    ]);

    const status = this.mapper.status(student.status);
    const documents = this.mapper.sortDocuments(student.documents);

    return {
      id: student.id,
      organizationId: student.organizationId,
      studentCode: student.studentCode,
      status,
      identity: this.mapper.identity(student),
      assignment: this.mapper.assignment(student),
      system: this.mapper.system(student),
      enrollments: student.enrollments.map((row) =>
        this.mapper.enrollment(row),
      ),
      documentCompletion: this.documents.completion(documents),
      availableStatusActions: this.lifecycle.availableActions(
        status,
        caller.permissionKeys ?? [],
      ),
      permissions: this.policy.recordPermissions(caller),
      statusHistory: student.statusHistory.map((entry) =>
        this.mapper.statusChange(entry, isActive),
      ),
      ...(student.archivedAt
        ? {
            archivedAt: student.archivedAt.toISOString(),
            archiveReason: student.archiveReason,
          }
        : {}),
      ...this.mapper.audit(student, isActive),
    };
  }

  async listEnrollments(caller: CallerContext, studentId: string) {
    const organizationId = await this.organizationId();
    const student = await this.repository.findDetail(studentId, organizationId);
    if (!student) throw new StudentNotFoundException();
    this.policy.assertInScope(caller, student);
    return student.enrollments.map((row) => this.mapper.enrollment(row));
  }

  /**
   * Profile update. Labels submitted by the client are ignored and re-resolved
   * from their identifiers (FR-016), and every protected field is simply absent
   * from the update payload built here (FR-017).
   */
  async updateProfile(
    caller: CallerContext,
    studentId: string,
    dto: UpdateStudentProfileDto,
  ) {
    const organizationId = await this.organizationId();
    const current = await this.repository.findById(studentId, organizationId);
    if (!current) throw new StudentNotFoundException();
    this.policy.assertInScope(caller, current);
    this.policy.assertMutable(this.mapper.status(current.status));

    const normalized = this.identity.validate(
      {
        fullName: dto.input.identity.fullName,
        primaryPhone: dto.input.identity.primaryPhone,
        ...(dto.input.identity.guardianName
          ? { guardianName: dto.input.identity.guardianName }
          : {}),
        ...(dto.input.identity.guardianPhone
          ? { guardianPhone: dto.input.identity.guardianPhone }
          : {}),
        ...(dto.input.identity.nationalId
          ? { nationalId: dto.input.identity.nationalId }
          : {}),
        ...(dto.input.identity.alternativeIdentityReason
          ? {
              alternativeIdentityReason:
                dto.input.identity.alternativeIdentityReason,
            }
          : {}),
        address: dto.input.identity.address,
        dateOfBirth: dto.input.identity.dateOfBirth,
        graduationYear: dto.input.identity.graduationYear,
      },
      this.lookups.identityRules(),
    );

    const labels = await this.resolveAssignmentLabels(
      organizationId,
      dto.input.assignment,
      dto.input.identity.qualificationId,
    );

    const guardianChanged =
      current.guardianName !== (dto.input.identity.guardianName ?? null) ||
      current.guardianPhone !== (normalized.guardianPhone ?? null);

    const actorName = caller.displayName || 'موظف';

    await this.transactions.run(async (tx) => {
      const result = await this.repository.updateCompareAndSwap(
        studentId,
        organizationId,
        dto.expectedVersion,
        {
          fullName: dto.input.identity.fullName.trim(),
          searchName: normalized.searchName,
          primaryPhone: normalized.primaryPhone,
          guardianName: dto.input.identity.guardianName?.trim() ?? null,
          guardianPhone: normalized.guardianPhone ?? null,
          nationalId: normalized.nationalId ?? null,
          normalizedNationalId: normalized.normalizedNationalId ?? null,
          alternativeIdentityReason:
            dto.input.identity.alternativeIdentityReason?.trim() ?? null,
          address: dto.input.identity.address.trim(),
          dateOfBirth: new Date(`${dto.input.identity.dateOfBirth}T00:00:00Z`),
          qualificationId: dto.input.identity.qualificationId,
          qualificationLabel: labels.qualificationLabel,
          graduationYear: dto.input.identity.graduationYear,
          ...(dto.input.identity.profileImageUrl !== undefined
            ? { profileImageUrl: dto.input.identity.profileImageUrl }
            : {}),
          registrationBranchId: dto.input.assignment.registrationBranchId,
          registrationBranchLabel: labels.registrationBranchLabel,
          studyBranchId: dto.input.assignment.studyBranchId,
          studyBranchLabel: labels.studyBranchLabel,
          departmentId: dto.input.assignment.departmentId,
          departmentLabel: labels.departmentLabel,
          academicGradeId: dto.input.assignment.academicGradeId ?? null,
          academicGradeLabel: labels.academicGradeLabel,
          customerServiceEmployeeId:
            dto.input.assignment.customerServiceEmployeeId,
          customerServiceEmployeeName: labels.customerServiceEmployeeName,
          updatedById: caller.accountId,
          updatedByName: actorName,
        },
        tx,
      );

      if (result.count === 0) {
        const latest = await this.repository.findById(
          studentId,
          organizationId,
          tx,
        );
        if (!latest) throw new StudentNotFoundException();
        throw new StudentVersionConflictException(latest.version);
      }

      await this.timeline.append(
        {
          studentId,
          category: 'profile-updated',
          actorId: caller.accountId,
          actorName,
          origin: 'students',
          subjectRef: studentId,
          summary: 'تم تحديث بيانات الطالب',
        },
        tx,
      );
    });

    this.events.emit(
      studentEvent(STUDENT_EVENT_NAMES.profileUpdated, {
        actorId: caller.accountId,
        studentId,
        operation: 'profile-updated',
      }),
    );
    if (guardianChanged)
      this.events.emit(
        studentEvent(STUDENT_EVENT_NAMES.guardianUpdated, {
          actorId: caller.accountId,
          studentId,
          operation: 'guardian-updated',
        }),
      );

    return this.getDetail(caller, studentId);
  }

  private async resolveAssignmentLabels(
    organizationId: string,
    assignment: UpdateStudentProfileDto['input']['assignment'],
    qualificationId: string,
  ) {
    const [
      registrationBranch,
      studyBranch,
      department,
      grade,
      qualification,
      employee,
    ] = await Promise.all([
      this.organization.resolve('branch', assignment.registrationBranchId),
      this.organization.resolve('branch', assignment.studyBranchId),
      this.organization.resolve('department', assignment.departmentId),
      assignment.academicGradeId
        ? this.organization.resolveValue(
            'academic-grades',
            assignment.academicGradeId,
          )
        : Promise.resolve(null),
      this.organization.resolveValue('qualifications', qualificationId),
      this.employees.resolve(
        assignment.customerServiceEmployeeId,
        organizationId,
      ),
    ]);

    if (!registrationBranch || !studyBranch || !department || !qualification)
      throw new StudentNotFoundException();

    return {
      registrationBranchLabel: registrationBranch.label,
      studyBranchLabel: studyBranch.label,
      departmentLabel: department.label,
      academicGradeLabel: grade?.label ?? null,
      qualificationLabel: qualification.label,
      customerServiceEmployeeName: employee?.label ?? '—',
    };
  }

  /**
   * Resolves which referenced employees are still active so an ActorRef keeps
   * its name after deactivation (FR-049).
   */
  private async actorLookup(
    organizationId: string,
    ids: readonly string[],
  ): Promise<ActiveLookup> {
    const unique = [...new Set(ids.filter(Boolean))];
    const resolved = await Promise.all(
      unique.map((id) =>
        this.employees
          .resolve(id, organizationId)
          .then((row) => [id, Boolean(row?.active)] as const)
          .catch(() => [id, false] as const),
      ),
    );
    const map = new Map(resolved);
    // An unknown id (for example the system actor used at intake) is treated as
    // active rather than rendering every historical row as "(inactive)".
    return (id: string) => map.get(id) ?? true;
  }
}
