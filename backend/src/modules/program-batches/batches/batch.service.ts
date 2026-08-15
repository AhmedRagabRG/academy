import { Inject, Injectable } from '@nestjs/common';
import type { BatchStatus } from '../../../../prisma/generated/client';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import {
  BatchCodeLockedException,
  BatchNotReadyException,
  DependencyInUseException,
  DependencyNotFoundException,
  DuplicateException,
  ForbiddenException,
  NotFoundException,
  OutOfScopeException,
  ProgramNotBatchableException,
  VersionConflictException,
} from '../../../core/exceptions';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  CATALOG_PUBLIC_PORT,
  type CatalogPublicPort,
} from '../../catalog/types/catalog-public.port';
import {
  ORGANIZATION_MASTER_DATA_PORT,
  type OrganizationMasterDataPort,
} from '../../organization/types/organization-master-data.port';
import { BatchCapacityService } from '../capacity/batch-capacity.service';
import { ProgramBatchEventName } from '../events/program-batch.events';
import { BatchFinancialPolicy } from '../financial/batch-financial.policy';
import {
  mapFinancialRevision,
  mapProgramBatch,
  type BatchAggregate,
} from '../mappers/program-batch.mapper';
import { normalizeBatchCode } from '../types/batch-normalization';
import type { BatchFinding } from '../types/program-batch.types';
import { BatchRepository } from './batch.repository';
import { BatchPolicy } from './batch.policy';
import type { BatchFinancialProfileDto } from './dto/batch-financial.dto';
import type { ChangeBatchStatusDto } from './dto/batch-lifecycle.dto';
import type { ListProgramBatchesDto } from './dto/list-batches.dto';
import type {
  CreateProgramBatchDto,
  UpdateProgramBatchDto,
} from './dto/upsert-batch.dto';

function withoutId<T extends { id: string }>(value: T): Omit<T, 'id'> {
  const { id, ...rest } = value;
  void id;
  return rest;
}

@Injectable()
export class BatchService {
  constructor(
    private readonly repository: BatchRepository,
    private readonly policy: BatchPolicy,
    private readonly financial: BatchFinancialPolicy,
    private readonly capacity: BatchCapacityService,
    private readonly transactions: TransactionManager,
    private readonly events: DomainEventBus,
    @Inject(CATALOG_PUBLIC_PORT) private readonly catalog: CatalogPublicPort,
    @Inject(ORGANIZATION_MASTER_DATA_PORT)
    private readonly organization: OrganizationMasterDataPort,
  ) {}

  async list(
    caller: CallerContext,
    programId: string,
    query: ListProgramBatchesDto,
  ) {
    await this.program(programId, false);
    if (
      !caller.organizationWide &&
      query.branchId &&
      !caller.authorizedBranchIds.includes(query.branchId)
    )
      throw new OutOfScopeException();
    const result = await this.repository.list(
      programId,
      query,
      caller.organizationWide ? undefined : caller.authorizedBranchIds,
    );
    return {
      ...result,
      items: await Promise.all(
        result.items.map((row) => this.project(row, caller)),
      ),
    };
  }

  async get(batchId: string, programId?: string, caller?: CallerContext) {
    const row = await this.repository.find(batchId, programId);
    if (!row) throw new NotFoundException();
    this.assertScope(row, caller);
    return this.project(row, caller);
  }

  async create(
    caller: CallerContext,
    programId: string,
    dto: CreateProgramBatchDto,
  ) {
    const program = await this.program(programId, true);
    await this.validateInput(dto, caller);
    let batchId: string;
    try {
      batchId = await this.transactions.runSerializable((tx) =>
        this.repository.create(
          program.organizationId,
          programId,
          dto,
          caller.accountId,
          tx,
        ),
      );
    } catch (error: unknown) {
      this.translateWriteError(error);
    }
    const row = await this.repository.find(batchId);
    if (!row) throw new NotFoundException();
    this.emit(
      ProgramBatchEventName.Created,
      caller,
      row.id,
      'create',
      row.version,
    );
    return this.project(row, caller);
  }

  async update(
    caller: CallerContext,
    programId: string,
    batchId: string,
    dto: UpdateProgramBatchDto,
  ) {
    const current = await this.repository.find(batchId, programId);
    if (!current) throw new NotFoundException();
    this.assertScope(current, caller);
    if (current.codeLockedAt && normalizeBatchCode(dto.code) !== current.code)
      throw new BatchCodeLockedException();
    await this.validateInput(dto, caller);
    const currentCapacity = await this.capacity.forBatch(
      batchId,
      current.maximumStudents,
    );
    this.policy.assertCapacity(
      dto.maximumStudents,
      currentCapacity.currentStudents,
    );
    const changes = {
      capacity: dto.maximumStudents !== current.maximumStudents,
      pricing:
        this.inputFinancialFingerprint(dto.financialProfile) !==
        this.currentFinancialFingerprint(current),
      branches:
        this.inputBranchFingerprint(dto) !==
        this.currentBranchFingerprint(current),
    };
    if (!this.policy.assertFieldPermissions(caller, changes))
      throw new ForbiddenException();
    try {
      await this.transactions.runSerializable(async (tx) => {
        const result = await this.repository.updateRoot(
          batchId,
          programId,
          dto.expectedVersion,
          dto,
          caller.accountId,
          tx,
        );
        if (result.count !== 1)
          throw new VersionConflictException(current.version);
        if (changes.branches)
          await this.repository.replaceBranches(
            batchId,
            dto,
            caller.accountId,
            tx,
          );
        if (changes.pricing) {
          const revisionId = await this.repository.appendFinancial(
            batchId,
            (current.currentFinancialRevision?.revisionNumber ?? 0) + 1,
            dto.expectedVersion + 1,
            dto.financialProfile,
            caller.accountId,
            tx,
          );
          await this.repository.setCurrentFinancialRevision(
            batchId,
            revisionId,
            tx,
          );
        }
      });
    } catch (error: unknown) {
      this.translateWriteError(error);
    }
    const row = await this.repository.find(batchId, programId);
    if (!row) throw new NotFoundException();
    this.emit(
      ProgramBatchEventName.Updated,
      caller,
      batchId,
      'update',
      row.version,
    );
    if (changes.capacity)
      this.emit(
        ProgramBatchEventName.CapacityChanged,
        caller,
        batchId,
        'capacity-change',
        row.version,
      );
    if (changes.branches)
      this.emit(
        ProgramBatchEventName.BranchesChanged,
        caller,
        batchId,
        'branch-change',
        row.version,
      );
    if (changes.pricing)
      this.emit(
        ProgramBatchEventName.FinancialChanged,
        caller,
        batchId,
        'financial-change',
        row.version,
      );
    return this.project(row, caller);
  }

  async readiness(batchId: string, programId?: string, caller?: CallerContext) {
    const row = await this.repository.find(batchId, programId);
    if (!row) throw new NotFoundException();
    this.assertScope(row, caller);
    const findings = await this.readinessFindings(row);
    return {
      ready: findings.length === 0,
      batchVersion: row.version,
      findings,
    };
  }

  async changeStatus(
    caller: CallerContext,
    programId: string,
    batchId: string,
    dto: ChangeBatchStatusDto,
  ) {
    const current = await this.repository.find(batchId, programId);
    if (!current) throw new NotFoundException();
    this.assertScope(current, caller);
    const toStatus: BatchStatus = dto.toStatus;
    this.policy.assertTransition(current.status, toStatus, dto.reason);
    const permission = this.policy.requiredTransitionPermission(
      current.status,
      toStatus,
    );
    if (!caller.permissionKeys.includes(permission))
      throw new ForbiddenException();
    if (toStatus === 'REGISTRATION_OPEN') {
      const readiness = await this.readiness(batchId, programId, caller);
      if (!readiness.ready) throw new BatchNotReadyException();
    }
    if (
      current.status === 'REGISTRATION_CLOSED' &&
      toStatus === 'STUDYING' &&
      (!current.studyStartDate || !current.studyEndDate)
    )
      throw new BatchNotReadyException();
    if (
      toStatus === 'ARCHIVED' &&
      (await this.capacity.hasDependencies(batchId))
    )
      throw new DependencyInUseException();
    await this.transactions.runSerializable(async (tx) => {
      const result = await this.repository.transition(
        batchId,
        programId,
        dto.expectedVersion,
        current.status,
        toStatus,
        dto.reason?.trim(),
        caller.accountId,
        tx,
      );
      if (result.count !== 1)
        throw new VersionConflictException(current.version);
    });
    const row = await this.repository.find(batchId, programId);
    if (!row) throw new NotFoundException();
    this.emit(
      toStatus === 'ARCHIVED'
        ? ProgramBatchEventName.Archived
        : ProgramBatchEventName.StatusChanged,
      caller,
      batchId,
      `status:${current.status}->${toStatus}`,
      row.version,
    );
    return this.project(row, caller);
  }

  async eligibility(
    batchId: string,
    branchId: string,
    today: string,
    caller?: CallerContext,
  ) {
    const row = await this.repository.find(batchId);
    if (!row) throw new NotFoundException();
    this.assertScope(row, caller);
    if (
      caller &&
      !caller.organizationWide &&
      !caller.authorizedBranchIds.includes(branchId)
    )
      throw new OutOfScopeException();
    const capacity = await this.capacity.forBatch(batchId, row.maximumStudents);
    const program = await this.catalog.resolve(row.programId);
    const date = today;
    const start = row.registrationStartDate?.toISOString().slice(0, 10);
    const end = row.registrationEndDate?.toISOString().slice(0, 10);
    const assignment = row.branches.find(
      (item) => item.branchId === branchId && item.role === 'REGISTRATION',
    );
    const branch = assignment
      ? await this.organization.resolve('branch', branchId)
      : null;
    const reasons = this.policy.eligibilityReasons({
      programAvailable: Boolean(
        program?.batchable && program.status === 'ACTIVE',
      ),
      registrationOpen: row.status === 'REGISTRATION_OPEN',
      today: date,
      registrationStartDate: start,
      registrationEndDate: end,
      availableSeats: capacity.availableSeats,
      branchEligible: Boolean(assignment && branch?.active),
    });
    return {
      eligible: reasons.length === 0,
      reasons,
      availableSeats: capacity.availableSeats,
      financialRevisionId: row.currentFinancialRevisionId ?? '',
      batchVersion: row.version,
    };
  }

  async lifecycle(batchId: string, caller?: CallerContext) {
    const row = await this.repository.find(batchId);
    if (!row) throw new NotFoundException();
    this.assertScope(row, caller);
    return this.repository.lifecycle(batchId).then((items) =>
      items.map((item) => ({
        id: item.id,
        fromStatus: item.fromStatus?.toLowerCase().replaceAll('_', '-') ?? null,
        toStatus: item.toStatus.toLowerCase().replaceAll('_', '-'),
        reason: item.reason,
        actorId: item.actorId,
        occurredAt: item.occurredAt.toISOString(),
        resultVersion: item.resultingVersion,
      })),
    );
  }

  async revisions(batchId: string, caller?: CallerContext) {
    const row = await this.repository.find(batchId);
    if (!row) throw new NotFoundException();
    this.assertScope(row, caller);
    return this.repository
      .revisions(batchId)
      .then((items) => items.map(mapFinancialRevision));
  }

  private async program(programId: string, requireEligible: boolean) {
    const program = await this.catalog.resolve(programId);
    if (!program) throw new NotFoundException();
    if (
      requireEligible &&
      (!program.batchable ||
        program.productType !== 'PROFESSIONAL_PROGRAM' ||
        program.status !== 'ACTIVE')
    )
      throw new ProgramNotBatchableException();
    return program;
  }

  private async validateInput(
    dto: CreateProgramBatchDto,
    caller: CallerContext,
  ): Promise<void> {
    this.policy.validateInput(dto);
    this.financial.validate(dto.financialProfile);
    const [year, intake, ...branches] = await Promise.all([
      this.organization.resolve('academicYear', dto.academicYearId),
      this.organization.resolveValue('program-intakes', dto.intakeId),
      ...dto.branchAssignments.map((item) =>
        this.organization.resolve('branch', item.branchId),
      ),
    ]);
    if (
      !year?.active ||
      !intake?.active ||
      branches.some((item) => !item?.active)
    )
      throw new DependencyNotFoundException();
    if (
      !caller.organizationWide &&
      dto.branchAssignments.some(
        (item) => !caller.authorizedBranchIds.includes(item.branchId),
      )
    )
      throw new OutOfScopeException();
  }

  private async readinessFindings(
    row: BatchAggregate,
  ): Promise<BatchFinding[]> {
    const findings: BatchFinding[] = [];
    const [program, year, intake, capacity] = await Promise.all([
      this.catalog.resolve(row.programId),
      this.organization.resolve('academicYear', row.academicYearId),
      this.organization.resolveValue('program-intakes', row.intakeId),
      this.capacity.forBatch(row.id, row.maximumStudents),
    ]);
    if (!program?.batchable || program.status !== 'ACTIVE')
      findings.push({
        code: 'PROGRAM_UNAVAILABLE',
        section: 'basic',
        field: 'programId',
        message: 'البرنامج غير متاح',
      });
    if (!year?.active)
      findings.push({
        code: 'ACADEMIC_YEAR_INACTIVE',
        section: 'basic',
        field: 'academicYearId',
        message: 'العام الأكاديمي غير نشط',
      });
    if (!intake?.active)
      findings.push({
        code: 'INTAKE_INACTIVE',
        section: 'basic',
        field: 'intakeId',
        message: 'فترة القبول غير نشطة',
      });
    if (
      !row.registrationStartDate ||
      !row.registrationEndDate ||
      !row.studyStartDate ||
      !row.studyEndDate ||
      !row.graduationDate
    )
      findings.push({
        code: 'SCHEDULE_INCOMPLETE',
        section: 'schedule',
        field: 'schedule',
        message: 'الجدول الأكاديمي غير مكتمل',
      });
    if (capacity.availableSeats === 0)
      findings.push({
        code: 'NO_AVAILABLE_SEATS',
        section: 'capacity',
        field: 'maximumStudents',
        message: 'لا توجد مقاعد متاحة',
      });
    if (!row.currentFinancialRevision)
      findings.push({
        code: 'FINANCIAL_PROFILE_MISSING',
        section: 'financial',
        field: 'financialProfile',
        message: 'الإعداد المالي غير مكتمل',
      });
    const branchReferences = await Promise.all(
      row.branches
        .filter((item) => item.role === 'REGISTRATION')
        .map((item) => this.organization.resolve('branch', item.branchId)),
    );
    if (!branchReferences.some((item) => item?.active))
      findings.push({
        code: 'REGISTRATION_BRANCH_MISSING',
        section: 'branches',
        field: 'branchAssignments',
        message: 'لا يوجد فرع تسجيل نشط',
      });
    return findings;
  }

  private async project(row: BatchAggregate, caller?: CallerContext) {
    const [program, academicYear, intake, ...branches] = await Promise.all([
      this.catalog.resolve(row.programId),
      this.organization.resolve('academicYear', row.academicYearId),
      this.organization.resolveValue('program-intakes', row.intakeId),
      ...row.branches.map((item) =>
        this.organization.resolve('branch', item.branchId),
      ),
    ]);
    if (!program || !academicYear || !intake)
      throw new DependencyNotFoundException();
    const branchMap = new Map(
      branches
        .filter((item) => item !== null)
        .map((item) => [item.id, item] as const),
    );
    return mapProgramBatch(
      row,
      await this.capacity.forBatch(row.id, row.maximumStudents),
      { program, academicYear, intake, branches: branchMap },
      caller,
    );
  }

  private assertScope(row: BatchAggregate, caller?: CallerContext): void {
    if (
      caller &&
      !caller.organizationWide &&
      !row.branches.some((branch) =>
        caller.authorizedBranchIds.includes(branch.branchId),
      )
    )
      throw new OutOfScopeException();
  }

  private inputBranchFingerprint(dto: CreateProgramBatchDto): string {
    return dto.branchAssignments
      .map((x) => `${x.branchId}:${x.role}`)
      .sort()
      .join('|');
  }

  private currentBranchFingerprint(row: BatchAggregate): string {
    return row.branches
      .map((x) => `${x.branchId}:${x.role.toLowerCase()}`)
      .sort()
      .join('|');
  }

  private inputFinancialFingerprint(profile: BatchFinancialProfileDto): string {
    return JSON.stringify({
      programPrice: profile.programPrice,
      registrationFee: profile.registrationFee,
      installmentsEnabled: profile.installmentsEnabled,
      installmentPlans: [...profile.installmentPlans]
        .sort((a, b) => a.position - b.position)
        .map((value) => {
          const plan = withoutId(value);
          return {
            ...plan,
            installments: plan.installments.map(withoutId),
          };
        }),
      offers: [...profile.offers]
        .sort((a, b) => a.position - b.position)
        .map((value) => ({
          ...withoutId(value),
          startDate: value.startDate ?? null,
          endDate: value.endDate ?? null,
        })),
    });
  }

  private currentFinancialFingerprint(row: BatchAggregate): string {
    if (!row.currentFinancialRevision) return '';
    const value = mapFinancialRevision(row.currentFinancialRevision);
    return JSON.stringify({
      programPrice: value.programPrice,
      registrationFee: value.registrationFee,
      installmentsEnabled: value.installmentsEnabled,
      installmentPlans: value.installmentPlans.map((value) => {
        const plan = withoutId(value);
        return {
          ...plan,
          installments: plan.installments.map(withoutId),
        };
      }),
      offers: value.offers.map(withoutId),
    });
  }

  private translateWriteError(error: unknown): never {
    if (error instanceof VersionConflictException) throw error;
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    )
      throw new DuplicateException('DUPLICATE_CODE');
    throw error;
  }

  private emit(
    name: ProgramBatchEventName,
    caller: CallerContext,
    id: string,
    operation: string,
    version: number,
  ): void {
    this.events.emit({
      name,
      occurredAt: new Date().toISOString(),
      actor: { accountId: caller.accountId },
      target: { type: 'program-batch', id },
      operation,
      payload: { version },
    });
  }
}
