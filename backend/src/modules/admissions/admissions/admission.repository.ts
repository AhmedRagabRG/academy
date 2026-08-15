import { Injectable } from '@nestjs/common';
import type {
  AdmissionStatus,
  Prisma,
} from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  createPageResult,
  normalizePageQuery,
  pageOffset,
} from '../../../shared/pagination/pagination.helper';
import { normalizeArabic } from '../../../shared/utils/arabic-normalize';
import type { ListAdmissionsDto } from './dto/list-admissions.dto';

export const admissionAggregateInclude = {
  applicant: true,
  currentSelectionRevision: true,
  currentFinancialRevision: true,
  currentDocumentPolicySnapshot: { include: { requirements: true } },
  approvalSnapshot: true,
  documents: {
    include: {
      currentRequirement: true,
      currentVersion: {
        include: { decisions: { orderBy: { decidedAt: 'asc' as const } } },
      },
    },
    orderBy: { requirementKey: 'asc' as const },
  },
} satisfies Prisma.AdmissionInclude;

@Injectable()
export class AdmissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(work, { isolationLevel: 'Serializable' });
  }

  findAggregate(
    id: string,
    organizationId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).admission.findFirst({
      where: { id, organizationId },
      include: admissionAggregateInclude,
    });
  }

  create(
    data: Prisma.AdmissionUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.admission.create({ data });
  }

  async list(
    organizationId: string,
    query: ListAdmissionsDto,
    authorizedBranchIds?: readonly string[],
  ) {
    const page = normalizePageQuery(query);
    const folded = query.search
      ? normalizeArabic(query.search).trim()
      : undefined;
    const scope: Prisma.AdmissionWhereInput | undefined = authorizedBranchIds
      ? {
          OR: [
            { registrationBranchId: { in: [...authorizedBranchIds] } },
            { studyBranchId: { in: [...authorizedBranchIds] } },
          ],
        }
      : undefined;
    const branch: Prisma.AdmissionWhereInput | undefined = query.branchId
      ? {
          OR: [
            { registrationBranchId: query.branchId },
            { studyBranchId: query.branchId },
          ],
        }
      : undefined;
    const search: Prisma.AdmissionWhereInput | undefined = folded
      ? {
          OR: [
            { reference: { contains: query.search, mode: 'insensitive' } },
            { applicant: { normalizedFullName: { contains: folded } } },
            {
              currentSelectionRevision: {
                offeringCode: { contains: query.search, mode: 'insensitive' },
              },
            },
            {
              currentSelectionRevision: {
                batchCode: { contains: query.search, mode: 'insensitive' },
              },
            },
          ],
        }
      : undefined;
    const where: Prisma.AdmissionWhereInput = {
      organizationId,
      AND: [scope, branch, search].filter(
        (item): item is Prisma.AdmissionWhereInput => item !== undefined,
      ),
      ...(query.offeringId
        ? { currentSelectionRevision: { offeringId: query.offeringId } }
        : {}),
      ...(query.batchId
        ? { currentSelectionRevision: { batchId: query.batchId } }
        : {}),
      ...(query.status
        ? {
            status: query.status
              .replace('-', '_')
              .toUpperCase() as AdmissionStatus,
          }
        : {}),
      ...(query.admissionsEmployeeId
        ? { admissionsEmployeeId: query.admissionsEmployeeId }
        : {}),
      ...(query.customerServiceEmployeeId
        ? { customerServiceEmployeeId: query.customerServiceEmployeeId }
        : {}),
      ...(query.customerServiceManagerId
        ? { customerServiceManagerId: query.customerServiceManagerId }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.admission.findMany({
        where,
        include: { applicant: true, currentSelectionRevision: true },
        orderBy: this.orderBy(query),
        skip: pageOffset(page),
        take: page.pageSize,
      }),
      this.prisma.admission.count({ where }),
    ]);
    return createPageResult(items, total, page);
  }

  private orderBy(
    query: ListAdmissionsDto,
  ): Prisma.AdmissionOrderByWithRelationInput[] {
    const direction = query.sortOrder ?? 'desc';
    if (query.sortBy === 'applicantName')
      return [{ applicant: { normalizedFullName: direction } }, { id: 'asc' }];
    if (query.sortBy === 'reference')
      return [{ reference: direction }, { id: 'asc' }];
    if (query.sortBy === 'status')
      return [{ status: direction }, { id: 'asc' }];
    return [{ updatedAt: direction }, { id: 'asc' }];
  }

  updateCompareAndSwap(
    id: string,
    organizationId: string,
    expectedVersion: number,
    data: Omit<Prisma.AdmissionUncheckedUpdateManyInput, 'version'>,
    tx: Prisma.TransactionClient,
  ) {
    return tx.admission.updateMany({
      where: { id, organizationId, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
  }

  transitionCompareAndSwap(
    id: string,
    organizationId: string,
    expectedVersion: number,
    fromStatus: AdmissionStatus,
    toStatus: AdmissionStatus,
    data: Omit<Prisma.AdmissionUncheckedUpdateManyInput, 'status' | 'version'>,
    tx: Prisma.TransactionClient,
  ) {
    return tx.admission.updateMany({
      where: {
        id,
        organizationId,
        version: expectedVersion,
        status: fromStatus,
      },
      data: { ...data, status: toStatus, version: { increment: 1 } },
    });
  }

  appendSelection(
    data: Prisma.AdmissionSelectionRevisionUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.admissionSelectionRevision.create({ data });
  }

  appendEligibility(
    data: Prisma.AdmissionEligibilityAssessmentUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.admissionEligibilityAssessment.create({ data });
  }

  appendFinancial(
    data: Prisma.AdmissionFinancialRevisionUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.admissionFinancialRevision.create({ data });
  }

  appendLifecycle(
    data: Prisma.AdmissionLifecycleEventUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.admissionLifecycleEvent.create({ data });
  }

  appendTimeline(
    data: Prisma.AdmissionTimelineEventUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.admissionTimelineEvent.create({ data });
  }

  createPolicySnapshot(
    data: Prisma.AdmissionDocumentPolicySnapshotUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.admissionDocumentPolicySnapshot.create({ data });
  }

  createRequirement(
    data: Prisma.AdmissionDocumentPolicyRequirementUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.admissionDocumentPolicyRequirement.create({ data });
  }

  createDocument(
    data: Prisma.AdmissionDocumentUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.admissionDocument.create({ data });
  }

  setCurrentPointers(
    admissionId: string,
    data: Pick<
      Prisma.AdmissionUncheckedUpdateInput,
      | 'currentSelectionRevisionId'
      | 'currentFinancialRevisionId'
      | 'currentDocumentPolicySnapshotId'
      | 'approvalSnapshotId'
    >,
    tx: Prisma.TransactionClient,
  ) {
    return tx.admission.update({ where: { id: admissionId }, data });
  }

  createApprovalSnapshot(
    data: Prisma.AdmissionApprovalSnapshotUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.admissionApprovalSnapshot.create({ data });
  }

  lifecycle(admissionId: string) {
    return this.prisma.admissionLifecycleEvent.findMany({
      where: { admissionId },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
  }

  async listLifecycle(admissionId: string, organizationId: string) {
    const owned = await this.prisma.admission.findFirst({
      where: { id: admissionId, organizationId },
      select: { id: true },
    });
    if (!owned) return [];
    return this.lifecycle(admissionId);
  }

  financialHistory(admissionId: string) {
    return this.prisma.admissionFinancialRevision.findMany({
      where: { admissionId },
      orderBy: [{ revisionNumber: 'asc' }, { id: 'asc' }],
    });
  }

  timeline(admissionId: string) {
    return this.prisma.admissionTimelineEvent.findMany({
      where: { admissionId },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
  }

  /**
   * Historical read of a settled approval snapshot and the financial revision
   * it pinned. Serves the Student Finance handoff, which needs the figures
   * after the admission is already enrolled — a point at which readiness
   * evaluation deliberately no longer returns them.
   */
  findApprovalFinancialSnapshot(approvalSnapshotId: string) {
    return this.prisma.admissionApprovalSnapshot.findUnique({
      where: { id: approvalSnapshotId },
      select: {
        id: true,
        admissionId: true,
        financialRevisionId: true,
        requiredAmountMinor: true,
        currency: true,
      },
    });
  }

  findFinancialRevision(financialRevisionId: string) {
    return this.prisma.admissionFinancialRevision.findUnique({
      where: { id: financialRevisionId },
      select: {
        id: true,
        productPriceMinor: true,
        registrationFeesMinor: true,
        discountAmountMinor: true,
        requiredAmountMinor: true,
        currency: true,
        precision: true,
      },
    });
  }

  async allocateReference(
    organizationId: string,
    year: number,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const rows = await tx.$queryRaw<Array<{ value: number }>>`
      INSERT INTO "AdmissionReferenceCounter" ("organizationId", "year", "nextValue", "updatedAt")
      VALUES (${organizationId}::uuid, ${year}, 2, NOW())
      ON CONFLICT ("organizationId", "year") DO UPDATE
      SET "nextValue" = "AdmissionReferenceCounter"."nextValue" + 1, "updatedAt" = NOW()
      RETURNING "nextValue" - 1 AS value
    `;
    const value = rows[0]?.value;
    if (value === undefined)
      throw new Error('Admission reference allocation failed');
    return `ADM-${year}-${String(value).padStart(5, '0')}`;
  }

  claimRequestKey(
    data: Prisma.AdmissionRequestKeyUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.admissionRequestKey.create({ data });
  }

  findRequestKey(
    organizationId: string,
    operationScope: string,
    idempotencyKey: string,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).admissionRequestKey.findUnique({
      where: {
        organizationId_operationScope_idempotencyKey: {
          organizationId,
          operationScope,
          idempotencyKey,
        },
      },
    });
  }

  completeRequestKey(
    requestId: string,
    targetId: string,
    tx: Prisma.TransactionClient,
  ) {
    return tx.admissionRequestKey.update({
      where: { id: requestId },
      data: { status: 'COMPLETED', targetId },
    });
  }
}
