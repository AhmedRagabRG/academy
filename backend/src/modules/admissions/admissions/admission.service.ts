import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  AdmissionOfferingKind,
  AdmissionStatus,
  DiscountMode,
  FinancialSourceKind,
} from '../../../../prisma/generated/client';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import {
  AdmissionIdempotencyConflictException,
  AdmissionOutOfScopeException,
} from '../../../core/exceptions/admissions.exceptions';
import {
  NotFoundException,
  ValidationException,
  VersionConflictException,
} from '../../../core/exceptions';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import { fromMinorUnits } from '../../../shared/utils/money.util';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import { ApplicantService } from '../applicants/applicant.service';
import { maskAdmissionPhone } from '../mappers/admission.mapper';
import { AdmissionFinancialPolicy } from './admission-financial.policy';
import {
  AdmissionReferenceService,
  type ResolvedAdmissionReferences,
} from './admission-reference.service';
import { AdmissionRepository } from './admission.repository';
import { DocumentRequirementService } from '../../organization/document-requirements/document-requirement.service';
import type {
  CreateAdmissionDto,
  FindAdmissionDuplicatesDto,
} from './dto/create-admission.dto';
import type { ListAdmissionsDto } from './dto/list-admissions.dto';
import type { UpdateAdmissionDto } from './dto/update-admission.dto';
import type {
  ChangeAdmissionSelectionDto,
  UpdateAdmissionFinancialsDto,
} from './dto/admission-revision.dto';

const DOCUMENTS = [
  [
    'personal-photo',
    'الصورة الشخصية',
    'SUBMITTED',
    ['image/jpeg', 'image/png'],
    3_000_000,
  ],
  [
    'national-id',
    'الرقم القومي',
    'SUBMITTED',
    ['application/pdf', 'image/jpeg', 'image/png'],
    5_000_000,
  ],
  [
    'parent-national-id',
    'الرقم القومي لولي الأمر',
    'APPROVED',
    ['application/pdf', 'image/jpeg', 'image/png'],
    5_000_000,
  ],
  [
    'birth-certificate',
    'شهادة الميلاد',
    'APPROVED',
    ['application/pdf', 'image/jpeg', 'image/png'],
    5_000_000,
  ],
  [
    'qualification-certificate',
    'شهادة المؤهل',
    'APPROVED',
    ['application/pdf', 'image/jpeg', 'image/png'],
    5_000_000,
  ],
  [
    'declaration',
    'الإقرار',
    'APPROVED',
    ['application/pdf', 'image/jpeg', 'image/png'],
    5_000_000,
  ],
] as const;

type Aggregate = NonNullable<
  Awaited<ReturnType<AdmissionRepository['findAggregate']>>
>;

@Injectable()
export class AdmissionService {
  constructor(
    private readonly repository: AdmissionRepository,
    private readonly applicants: ApplicantService,
    private readonly references: AdmissionReferenceService,
    private readonly financial: AdmissionFinancialPolicy,
    private readonly profile: OrganizationProfileService,
    private readonly requirements: DocumentRequirementService,
    private readonly transactions: TransactionManager,
    private readonly events: DomainEventBus,
  ) {}

  async duplicates(input: FindAdmissionDuplicatesDto) {
    const organization = await this.profile.get();
    return this.applicants.duplicates(organization.organizationId, input);
  }

  async create(caller: CallerContext, dto: CreateAdmissionDto) {
    const resolved = await this.references.resolve(
      dto.input.selection,
      dto.input.assignment,
    );
    this.assertScope(
      caller,
      dto.input.assignment.registrationBranchId,
      dto.input.assignment.studyBranchId,
    );
    const calculation = this.financial.calculate({
      productPrice: resolved.price.productPrice,
      registrationFees: resolved.price.registrationFees,
      discountMode: dto.input.financial.discountMode,
      discountValue: dto.input.financial.discountValue,
    });
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(dto.input))
      .digest('hex');
    let admissionId = '';
    await this.transactions.runSerializable(async (tx) => {
      if (dto.idempotencyKey) {
        const prior = await this.repository.findRequestKey(
          resolved.organizationId,
          'admission:create',
          dto.idempotencyKey,
          tx,
        );
        if (prior) {
          if (prior.requestFingerprint !== fingerprint)
            throw new AdmissionIdempotencyConflictException();
          if (prior.targetId) {
            admissionId = prior.targetId;
            return;
          }
          throw new AdmissionIdempotencyConflictException();
        }
      }
      const request = dto.idempotencyKey
        ? await this.repository.claimRequestKey(
            {
              organizationId: resolved.organizationId,
              operationScope: 'admission:create',
              idempotencyKey: dto.idempotencyKey,
              requestFingerprint: fingerprint,
            },
            tx,
          )
        : null;
      const applicant = await this.applicants.resolveForCreate(
        resolved.organizationId,
        dto.input.applicant,
        dto.duplicateResolution,
        caller.accountId,
        tx,
      );
      const reference = await this.repository.allocateReference(
        resolved.organizationId,
        new Date().getUTCFullYear(),
        tx,
      );
      const admission = await this.repository.create(
        {
          organizationId: resolved.organizationId,
          reference,
          applicantId: applicant.id,
          ...this.assignmentData(dto, resolved),
          privateNotes: dto.input.notes?.trim(),
          createdBy: caller.accountId,
          updatedBy: caller.accountId,
        },
        tx,
      );
      admissionId = admission.id;
      const selection = await this.repository.appendSelection(
        {
          admissionId,
          revisionNumber: 1,
          // The admission is created at version 1, and the table's
          // `_positive` check requires a source above zero — a first revision
          // is recorded *at* version 1 rather than as a transition from a
          // version that never existed.
          sourceAdmissionVersion: 1,
          resultAdmissionVersion: 1,
          offeringKind: this.offeringKind(resolved.offering.kind),
          offeringId: resolved.offering.id,
          offeringVersion: resolved.offering.version,
          offeringLabel: resolved.offering.label,
          offeringCode: resolved.offering.code,
          batchId: resolved.batch?.id,
          batchVersion: resolved.batch?.version,
          batchLabel: resolved.batch?.label,
          batchCode: resolved.batch?.code,
          batchFinancialRevisionId: resolved.batch?.financialRevisionId,
          registrationBranch: {
            id: dto.input.assignment.registrationBranchId,
            label: resolved.labels.registrationBranch,
          },
          studyBranch: {
            id: dto.input.assignment.studyBranchId,
            label: resolved.labels.studyBranch,
          },
          createdBy: caller.accountId,
        },
        tx,
      );
      await this.repository.appendEligibility(
        {
          admissionId,
          selectionRevisionId: selection.id,
          context: 'SELECTION',
          eligible:
            resolved.offering.active &&
            (resolved.offering.kind !== 'professional-program' ||
              Boolean(resolved.batch)),
          offeringVersion: resolved.offering.version,
          batchVersion: resolved.batch?.version,
          availableSeats: resolved.batch?.availableSeats,
          reasonCodes: [],
        },
        tx,
      );
      const financial = await this.repository.appendFinancial(
        {
          admissionId,
          revisionNumber: 1,
          sourceKind: resolved.batch
            ? FinancialSourceKind.PROGRAM_BATCH
            : FinancialSourceKind.CATALOG_OFFERING,
          sourceId: resolved.price.sourceId,
          sourceVersion: resolved.price.sourceVersion,
          sourceFinancialRevisionId: resolved.price.financialRevisionId,
          productPriceMinor: calculation.productPriceMinor,
          registrationFeesMinor: calculation.registrationFeesMinor,
          currency: calculation.productPrice.currency,
          precision: calculation.productPrice.precision,
          discountMode: this.discountMode(dto.input.financial.discountMode),
          discountPercentageScaled:
            dto.input.financial.discountMode === 'percentage'
              ? Number.parseInt(dto.input.financial.discountValue, 10) * 100
              : 0,
          discountAmountMinor: calculation.discountAmountMinor,
          requiredAmountMinor: calculation.requiredAmountMinor,
          reason: dto.input.financial.reason,
          resultAdmissionVersion: 1,
          createdBy: caller.accountId,
        },
        tx,
      );
      // The configured list, preferring an override written for this offering
      // and otherwise the organization default. `DOCUMENTS` remains only as the
      // fallback for an organization whose policy has not been seeded yet.
      const configured = await this.requirements.resolve(
        'admissions',
        resolved.offering.id,
      );
      const definitions = configured?.requirements.filter((row) => row.enabled)
        .length
        ? configured.requirements.filter((row) => row.enabled)
        : DOCUMENTS.map(([stableKey, label, stage, mimes, maximumBytes]) => ({
            stableKey,
            label,
            required: stableKey !== 'parent-national-id',
            requiredAt: stage === 'SUBMITTED' ? ('submission' as const) : ('approval' as const),
            allowedMimeTypes: [...mimes],
            maximumBytes,
          }));

      const policy = await this.repository.createPolicySnapshot(
        {
          admissionId,
          sourcePolicyId: configured?.id ?? resolved.offering.id,
          sourcePolicyVersion: configured?.version ?? 1,
          snapshotVersion: 1,
          createdBy: caller.accountId,
        },
        tx,
      );
      for (const definition of definitions) {
        const requirement = await this.repository.createRequirement(
          {
            snapshotId: policy.id,
            stableKey: definition.stableKey,
            label: definition.label,
            required: definition.required,
            requiredAtStage:
              definition.requiredAt === 'submission' ? 'SUBMITTED' : 'APPROVED',
            allowedMimeTypes: [...definition.allowedMimeTypes],
            maximumBytes: definition.maximumBytes,
            sourceRequirementId: randomUUID(),
          },
          tx,
        );
        await this.repository.createDocument(
          {
            admissionId,
            requirementKey: definition.stableKey,
            currentRequirementId: requirement.id,
            createdBy: caller.accountId,
            updatedBy: caller.accountId,
          },
          tx,
        );
      }
      await this.repository.setCurrentPointers(
        admissionId,
        {
          currentSelectionRevisionId: selection.id,
          currentFinancialRevisionId: financial.id,
          currentDocumentPolicySnapshotId: policy.id,
        },
        tx,
      );
      await this.repository.appendLifecycle(
        {
          admissionId,
          fromStatus: null,
          toStatus: AdmissionStatus.DRAFT,
          actorId: caller.accountId,
          actorName: caller.displayName,
          sourceVersion: 0,
          resultVersion: 1,
        },
        tx,
      );
      await this.repository.appendTimeline(
        {
          admissionId,
          kind: 'CREATED',
          sourceAdmissionVersion: 0,
          resultAdmissionVersion: 1,
          actorId: caller.accountId,
          actorName: caller.displayName,
          metadata: { reference },
        },
        tx,
      );
      if (request)
        await this.repository.completeRequestKey(request.id, admissionId, tx);
    });
    const aggregate = await this.repository.findAggregate(
      admissionId,
      resolved.organizationId,
    );
    if (!aggregate) throw new NotFoundException();
    this.events.emit({
      name: 'admissions.created',
      occurredAt: new Date().toISOString(),
      actor: { accountId: caller.accountId },
      target: { type: 'admission', id: admissionId },
      operation: 'create',
      payload: { version: aggregate.version },
    });
    return this.mapDetail(aggregate, caller);
  }

  async list(caller: CallerContext, query: ListAdmissionsDto) {
    const organization = await this.profile.get();
    if (
      !caller.organizationWide &&
      query.branchId &&
      !caller.authorizedBranchIds.includes(query.branchId)
    )
      throw new AdmissionOutOfScopeException();
    const result = await this.repository.list(
      organization.organizationId,
      query,
      caller.organizationWide ? undefined : caller.authorizedBranchIds,
    );
    return {
      ...result,
      items: result.items.map((row) => this.mapList(row, caller)),
    };
  }

  async get(caller: CallerContext, id: string) {
    const organization = await this.profile.get();
    const row = await this.repository.findAggregate(
      id,
      organization.organizationId,
    );
    if (!row) throw new NotFoundException();
    this.assertScope(caller, row.registrationBranchId, row.studyBranchId);
    return this.mapDetail(row, caller);
  }

  async update(caller: CallerContext, id: string, dto: UpdateAdmissionDto) {
    const organization = await this.profile.get();
    const current = await this.repository.findAggregate(
      id,
      organization.organizationId,
    );
    if (!current) throw new NotFoundException();
    this.assertScope(
      caller,
      current.registrationBranchId,
      current.studyBranchId,
    );
    if (current.status !== AdmissionStatus.DRAFT)
      throw new ValidationException([
        { field: 'status', message: 'يمكن تعديل القبول في حالة المسودة فقط' },
      ]);
    const resolved = await this.references.resolve(
      dto.input.selection,
      dto.input.assignment,
    );
    this.assertScope(
      caller,
      dto.input.assignment.registrationBranchId,
      dto.input.assignment.studyBranchId,
    );
    await this.transactions.runSerializable(async (tx) => {
      await this.applicants.updateForAdmission(
        organization.organizationId,
        current.applicantId,
        dto.input.applicant,
        caller.accountId,
        tx,
      );
      const result = await this.repository.updateCompareAndSwap(
        id,
        organization.organizationId,
        dto.expectedVersion,
        {
          ...this.assignmentData({ input: dto.input }, resolved),
          privateNotes: dto.input.notes?.trim(),
          updatedBy: caller.accountId,
        },
        tx,
      );
      if (result.count !== 1)
        throw new VersionConflictException(current.version);
      await this.repository.appendTimeline(
        {
          admissionId: id,
          kind: 'ASSIGNMENT_CHANGED',
          sourceAdmissionVersion: dto.expectedVersion,
          resultAdmissionVersion: dto.expectedVersion + 1,
          actorId: caller.accountId,
          actorName: caller.displayName,
          metadata: {
            notesChanged: dto.input.notes?.trim() !== current.privateNotes,
          },
        },
        tx,
      );
    });
    return this.get(caller, id);
  }

  async lifecycle(caller: CallerContext, id: string) {
    await this.get(caller, id);
    return this.repository.lifecycle(id);
  }

  async financialHistory(caller: CallerContext, id: string) {
    await this.get(caller, id);
    return (await this.repository.financialHistory(id)).map((row) => ({
      ...row,
      productPrice: fromMinorUnits(
        row.productPriceMinor,
        row.currency,
        row.precision,
      ),
      registrationFees: fromMinorUnits(
        row.registrationFeesMinor,
        row.currency,
        row.precision,
      ),
      discountAmount: fromMinorUnits(
        row.discountAmountMinor,
        row.currency,
        row.precision,
      ),
      requiredAmount: fromMinorUnits(
        row.requiredAmountMinor,
        row.currency,
        row.precision,
      ),
      productPriceMinor: undefined,
      registrationFeesMinor: undefined,
      discountAmountMinor: undefined,
      requiredAmountMinor: undefined,
    }));
  }

  async changeSelection(
    caller: CallerContext,
    id: string,
    dto: ChangeAdmissionSelectionDto,
  ) {
    if (
      !dto.confirmedConsequences.includes('financial-recalculated') ||
      !dto.confirmedConsequences.includes('documents-repolicied')
    )
      throw new ValidationException([
        {
          field: 'confirmedConsequences',
          message: 'يجب تأكيد الآثار المالية وآثار المستندات',
        },
      ]);
    const organization = await this.profile.get();
    const current = await this.repository.findAggregate(
      id,
      organization.organizationId,
    );
    if (!current) throw new NotFoundException();
    this.assertScope(
      caller,
      current.registrationBranchId,
      current.studyBranchId,
    );
    const assignment = {
      registrationBranchId: current.registrationBranchId,
      studyBranchId: current.studyBranchId,
      admissionsEmployeeId: current.admissionsEmployeeId,
      customerServiceEmployeeId: current.customerServiceEmployeeId,
      customerServiceManagerId: current.customerServiceManagerId,
      departmentId: current.departmentId,
      leadSourceId: current.leadSourceId,
      academicGradeId: current.academicGradeId ?? undefined,
    };
    const refs = await this.references.resolve(dto.selection, assignment);
    const priorFinancial = current.currentFinancialRevision;
    if (!priorFinancial) throw new NotFoundException();
    const calculation = this.financial.calculate({
      productPrice: refs.price.productPrice,
      registrationFees: refs.price.registrationFees,
      discountMode: 'amount',
      discountValue: fromMinorUnits(
        priorFinancial.discountAmountMinor,
        priorFinancial.currency,
        priorFinancial.precision,
      ).amount,
    });
    await this.transactions.runSerializable(async (tx) => {
      const changed = await this.repository.updateCompareAndSwap(
        id,
        organization.organizationId,
        dto.expectedVersion,
        { updatedBy: caller.accountId },
        tx,
      );
      if (changed.count !== 1)
        throw new VersionConflictException(current.version);
      const version = dto.expectedVersion + 1;
      const selection = await this.repository.appendSelection(
        {
          admissionId: id,
          revisionNumber:
            (current.currentSelectionRevision?.revisionNumber ?? 0) + 1,
          sourceAdmissionVersion: dto.expectedVersion,
          resultAdmissionVersion: version,
          offeringKind: this.offeringKind(refs.offering.kind),
          offeringId: refs.offering.id,
          offeringVersion: refs.offering.version,
          offeringLabel: refs.offering.label,
          offeringCode: refs.offering.code,
          batchId: refs.batch?.id,
          batchVersion: refs.batch?.version,
          batchLabel: refs.batch?.label,
          batchCode: refs.batch?.code,
          batchFinancialRevisionId: refs.batch?.financialRevisionId,
          registrationBranch: {
            id: current.registrationBranchId,
            label: current.registrationBranchLabel,
          },
          studyBranch: {
            id: current.studyBranchId,
            label: current.studyBranchLabel,
          },
          changeReason: dto.reason,
          createdBy: caller.accountId,
        },
        tx,
      );
      await this.repository.appendEligibility(
        {
          admissionId: id,
          selectionRevisionId: selection.id,
          context: 'SELECTION',
          eligible: refs.offering.active,
          offeringVersion: refs.offering.version,
          batchVersion: refs.batch?.version,
          availableSeats: refs.batch?.availableSeats,
          reasonCodes: [],
        },
        tx,
      );
      const financial = await this.repository.appendFinancial(
        {
          admissionId: id,
          revisionNumber: priorFinancial.revisionNumber + 1,
          sourceKind: refs.batch
            ? FinancialSourceKind.PROGRAM_BATCH
            : FinancialSourceKind.CATALOG_OFFERING,
          sourceId: refs.price.sourceId,
          sourceVersion: refs.price.sourceVersion,
          sourceFinancialRevisionId: refs.price.financialRevisionId,
          productPriceMinor: calculation.productPriceMinor,
          registrationFeesMinor: calculation.registrationFeesMinor,
          currency: calculation.productPrice.currency,
          precision: calculation.productPrice.precision,
          discountMode: DiscountMode.AMOUNT,
          discountPercentageScaled: 0,
          discountAmountMinor: calculation.discountAmountMinor,
          requiredAmountMinor: calculation.requiredAmountMinor,
          reason: dto.reason,
          resultAdmissionVersion: version,
          createdBy: caller.accountId,
        },
        tx,
      );
      await this.repository.setCurrentPointers(
        id,
        {
          currentSelectionRevisionId: selection.id,
          currentFinancialRevisionId: financial.id,
        },
        tx,
      );
      await this.repository.appendTimeline(
        {
          admissionId: id,
          kind: 'SELECTION_CHANGED',
          sourceAdmissionVersion: dto.expectedVersion,
          resultAdmissionVersion: version,
          actorId: caller.accountId,
          actorName: caller.displayName,
          metadata: {
            offeringId: refs.offering.id,
            batchId: refs.batch?.id ?? null,
          },
        },
        tx,
      );
    });
    return this.get(caller, id);
  }

  async updateFinancials(
    caller: CallerContext,
    id: string,
    dto: UpdateAdmissionFinancialsDto,
  ) {
    const organization = await this.profile.get();
    const current = await this.repository.findAggregate(
      id,
      organization.organizationId,
    );
    if (!current?.currentFinancialRevision) throw new NotFoundException();
    this.assertScope(
      caller,
      current.registrationBranchId,
      current.studyBranchId,
    );
    const prior = current.currentFinancialRevision;
    const calculation = this.financial.calculate({
      productPrice: fromMinorUnits(
        prior.productPriceMinor,
        prior.currency,
        prior.precision,
      ),
      registrationFees: fromMinorUnits(
        prior.registrationFeesMinor,
        prior.currency,
        prior.precision,
      ),
      discountMode: dto.input.discountMode,
      discountValue: dto.input.discountValue,
    });
    await this.transactions.runSerializable(async (tx) => {
      const changed = await this.repository.updateCompareAndSwap(
        id,
        organization.organizationId,
        dto.expectedVersion,
        { updatedBy: caller.accountId },
        tx,
      );
      if (changed.count !== 1)
        throw new VersionConflictException(current.version);
      const revision = await this.repository.appendFinancial(
        {
          admissionId: id,
          revisionNumber: prior.revisionNumber + 1,
          sourceKind: prior.sourceKind,
          sourceId: prior.sourceId,
          sourceVersion: prior.sourceVersion,
          sourceFinancialRevisionId: prior.sourceFinancialRevisionId,
          productPriceMinor: calculation.productPriceMinor,
          registrationFeesMinor: calculation.registrationFeesMinor,
          currency: calculation.productPrice.currency,
          precision: calculation.productPrice.precision,
          discountMode: this.discountMode(dto.input.discountMode),
          discountPercentageScaled:
            dto.input.discountMode === 'percentage'
              ? Math.round(Number(dto.input.discountValue) * 100)
              : 0,
          discountAmountMinor: calculation.discountAmountMinor,
          requiredAmountMinor: calculation.requiredAmountMinor,
          reason: dto.input.reason,
          resultAdmissionVersion: dto.expectedVersion + 1,
          createdBy: caller.accountId,
        },
        tx,
      );
      await this.repository.setCurrentPointers(
        id,
        { currentFinancialRevisionId: revision.id },
        tx,
      );
      await this.repository.appendTimeline(
        {
          admissionId: id,
          kind: 'FINANCIAL_UPDATED',
          sourceAdmissionVersion: dto.expectedVersion,
          resultAdmissionVersion: dto.expectedVersion + 1,
          actorId: caller.accountId,
          actorName: caller.displayName,
          metadata: { revisionId: revision.id },
        },
        tx,
      );
    });
    return this.get(caller, id);
  }

  private assignmentData(
    dto: Pick<CreateAdmissionDto, 'input'>,
    refs: ResolvedAdmissionReferences,
  ) {
    const value = dto.input.assignment;
    return {
      registrationBranchId: value.registrationBranchId,
      registrationBranchLabel: refs.labels.registrationBranch,
      studyBranchId: value.studyBranchId,
      studyBranchLabel: refs.labels.studyBranch,
      admissionsEmployeeId: value.admissionsEmployeeId,
      admissionsEmployeeLabel: refs.labels.admissionsEmployee,
      customerServiceEmployeeId: value.customerServiceEmployeeId,
      customerServiceEmployeeLabel: refs.labels.customerServiceEmployee,
      customerServiceManagerId: value.customerServiceManagerId,
      customerServiceManagerLabel: refs.labels.customerServiceManager,
      departmentId: value.departmentId,
      departmentLabel: refs.labels.department,
      leadSourceId: value.leadSourceId,
      leadSourceLabel: refs.labels.leadSource,
      academicGradeId: value.academicGradeId,
      academicGradeLabel: refs.labels.academicGrade || undefined,
    };
  }

  private mapList(
    row: Awaited<ReturnType<AdmissionRepository['list']>>['items'][number],
    caller: CallerContext,
  ) {
    return {
      id: row.id,
      reference: row.reference,
      applicantName: row.applicant.fullName,
      phoneHint: maskAdmissionPhone(row.applicant.primaryPhone),
      offeringLabel: row.currentSelectionRevision?.offeringLabel ?? '',
      batchLabel: row.currentSelectionRevision?.batchLabel ?? undefined,
      registrationBranchLabel: row.registrationBranchLabel,
      studyBranchLabel: row.studyBranchLabel,
      status: this.status(row.status),
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
      permissions: this.permissions(caller, row.status),
    };
  }

  private mapDetail(row: Aggregate, caller: CallerContext) {
    const financial = row.currentFinancialRevision;
    return {
      ...this.mapList(
        { ...row, currentSelectionRevision: row.currentSelectionRevision },
        caller,
      ),
      applicant: {
        id: row.applicant.id,
        fullName: row.applicant.fullName,
        primaryPhone: row.applicant.primaryPhone,
        guardianPhone: row.applicant.guardianPhone,
        nationalId: row.applicant.nationalId,
        alternativeIdentityReason: row.applicant.alternativeIdentityReason,
        address: row.applicant.address,
        dateOfBirth: row.applicant.dateOfBirth.toISOString().slice(0, 10),
        qualificationId: row.applicant.qualificationId,
        qualificationLabel: row.applicant.qualificationLabel,
        graduationYear: row.applicant.graduationYear,
      },
      assignment: {
        registrationBranchId: row.registrationBranchId,
        registrationBranchLabel: row.registrationBranchLabel,
        studyBranchId: row.studyBranchId,
        studyBranchLabel: row.studyBranchLabel,
        admissionsEmployeeId: row.admissionsEmployeeId,
        admissionsEmployeeName: row.admissionsEmployeeLabel,
        customerServiceEmployeeId: row.customerServiceEmployeeId,
        customerServiceEmployeeName: row.customerServiceEmployeeLabel,
        customerServiceManagerId: row.customerServiceManagerId,
        customerServiceManagerName: row.customerServiceManagerLabel,
        departmentId: row.departmentId,
        departmentLabel: row.departmentLabel,
        leadSourceId: row.leadSourceId,
        leadSourceLabel: row.leadSourceLabel,
        academicGradeId: row.academicGradeId,
        academicGradeLabel: row.academicGradeLabel,
      },
      selection: row.currentSelectionRevision
        ? this.selection(row.currentSelectionRevision)
        : undefined,
      ...(caller.permissionKeys.includes('admissions.finance.view') && financial
        ? {
            financial: {
              id: financial.id,
              revisionNumber: financial.revisionNumber,
              productPrice: fromMinorUnits(
                financial.productPriceMinor,
                financial.currency,
                financial.precision,
              ),
              registrationFees: fromMinorUnits(
                financial.registrationFeesMinor,
                financial.currency,
                financial.precision,
              ),
              discountMode: financial.discountMode.toLowerCase(),
              discountAmount: fromMinorUnits(
                financial.discountAmountMinor,
                financial.currency,
                financial.precision,
              ),
              requiredAmount: fromMinorUnits(
                financial.requiredAmountMinor,
                financial.currency,
                financial.precision,
              ),
            },
          }
        : {}),
      requirementSnapshot: row.currentDocumentPolicySnapshot,
      ...(caller.permissionKeys.includes('admissions.documents.view')
        ? { documents: row.documents }
        : {}),
      approvalSnapshot: this.approvalSnapshot(
        row.approvalSnapshot,
        financial?.precision,
      ),
      notes: row.privateNotes ?? '',
      activeReviewer: row.activeReviewerId
        ? { id: row.activeReviewerId, name: row.activeReviewerName }
        : undefined,
    };
  }

  /**
   * The approval snapshot carries `requiredAmountMinor` as a `BigInt`, which
   * `JSON.stringify` refuses outright — returning the row as Prisma hands it
   * over made every read of an approved or enrolled admission fail with a 500.
   * Converting it here matches how the financial revision above is already
   * published, so money leaves this service as a decimal string either way.
   */
  private approvalSnapshot(
    row: Aggregate['approvalSnapshot'],
    precision = 2,
  ) {
    if (!row) return undefined;
    const { requiredAmountMinor, ...rest } = row;
    return {
      ...rest,
      requiredAmount: fromMinorUnits(requiredAmountMinor, row.currency, precision),
    };
  }

  private selection(row: Aggregate['currentSelectionRevision']) {
    if (!row) return undefined;
    return {
      id: row.id,
      revisionNumber: row.revisionNumber,
      offeringKind: row.offeringKind.toLowerCase().replaceAll('_', '-'),
      offeringId: row.offeringId,
      offeringVersion: row.offeringVersion,
      offeringLabel: row.offeringLabel,
      offeringCode: row.offeringCode,
      batchId: row.batchId,
      batchVersion: row.batchVersion,
      batchLabel: row.batchLabel,
      batchCode: row.batchCode,
      batchFinancialRevisionId: row.batchFinancialRevisionId,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy,
    };
  }

  private permissions(caller: CallerContext, status: AdmissionStatus) {
    return {
      update:
        status === AdmissionStatus.DRAFT &&
        caller.permissionKeys.includes('admissions.update'),
      archive:
        status !== AdmissionStatus.ENROLLED &&
        status !== AdmissionStatus.ARCHIVED &&
        caller.permissionKeys.includes('admissions.archive'),
      assign: caller.permissionKeys.includes('admissions.assign'),
      academic: caller.permissionKeys.includes('admissions.academic.manage'),
      finance: caller.permissionKeys.includes('admissions.finance.manage'),
      documents: caller.permissionKeys.includes('admissions.documents.manage'),
    };
  }

  private assertScope(caller: CallerContext, ...branchIds: string[]) {
    if (
      !caller.organizationWide &&
      !branchIds.some((id) => caller.authorizedBranchIds.includes(id))
    )
      throw new AdmissionOutOfScopeException();
  }

  private offeringKind(
    value: ResolvedAdmissionReferences['offering']['kind'],
  ): AdmissionOfferingKind {
    return value === 'professional-program'
      ? AdmissionOfferingKind.PROFESSIONAL_PROGRAM
      : value === 'professional-diploma'
        ? AdmissionOfferingKind.PROFESSIONAL_DIPLOMA
        : AdmissionOfferingKind.TRAINING_COURSE;
  }

  private discountMode(value: 'none' | 'percentage' | 'amount'): DiscountMode {
    return value === 'percentage'
      ? DiscountMode.PERCENTAGE
      : value === 'amount'
        ? DiscountMode.AMOUNT
        : DiscountMode.NONE;
  }

  private status(value: AdmissionStatus) {
    return value.toLowerCase().replaceAll('_', '-');
  }
}
