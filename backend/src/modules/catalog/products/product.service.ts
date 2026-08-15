import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import {
  CatalogCodeLockedException,
  DuplicateException,
  ForbiddenException,
  NotFoundException,
  OutOfScopeException,
  ValidationException,
  VersionConflictException,
} from '../../../core/exceptions';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import { CatalogEventName } from '../events/catalog.events';
import { mapProduct } from '../mappers/catalog.mapper';
import {
  CATALOG_IDENTITY_PORT,
  CATALOG_ORGANIZATION_PORT,
  type CatalogIdentityPort,
  type CatalogOrganizationPort,
} from '../types/catalog-reference.port';
import {
  normalizeCatalogCode,
  normalizeCatalogSearch,
} from '../types/catalog-normalization';
import type {
  CreateProductDto,
  ProductListDto,
  ProductStatusDto,
  UpdateProductDto,
} from './dto/product.dto';
import { ProductPolicy } from './product.policy';
import { ProductRepository } from './product.repository';

@Injectable()
export class ProductService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly policy: ProductPolicy,
    private readonly transactions: TransactionManager,
    private readonly events: DomainEventBus,
    @Inject(CATALOG_ORGANIZATION_PORT)
    private readonly organization: CatalogOrganizationPort,
    @Inject(CATALOG_IDENTITY_PORT)
    private readonly identity: CatalogIdentityPort,
  ) {}
  private async project(
    row: NonNullable<Awaited<ReturnType<ProductRepository['find']>>>,
  ) {
    const [category, department, instructor, branchOptions] = await Promise.all(
      [
        this.organization.category(row.categoryId),
        row.departmentId
          ? this.organization.resolve('department', row.departmentId)
          : null,
        row.instructorEmployeeId
          ? this.identity.instructor(row.instructorEmployeeId)
          : null,
        this.organization.options('branch'),
      ],
    );
    const labels = new Map(branchOptions.map((option) => [option.id, option]));
    return {
      ...mapProduct(row),
      category,
      department,
      instructor,
      branches: row.branches.map((branch) => ({
        ...branch,
        branch: labels.get(branch.branchId) ?? null,
      })),
    };
  }
  async list(c: CallerContext, q: ProductListDto) {
    if (
      !c.organizationWide &&
      q.branchIds?.some((id) => !c.authorizedBranchIds.includes(id))
    )
      throw new OutOfScopeException();
    const query = q.search
      ? { ...q, search: normalizeCatalogSearch(q.search) }
      : q;
    const result = await this.repository.list(
      query,
      c.organizationWide ? undefined : c.authorizedBranchIds,
    );
    return {
      ...result,
      items: await Promise.all(result.items.map((row) => this.project(row))),
    };
  }
  async get(id: string, c?: CallerContext) {
    const row = await this.repository.find(id);
    if (!row) throw new NotFoundException();
    if (
      c &&
      !c.organizationWide &&
      !row.branches.some((branch) =>
        c.authorizedBranchIds.includes(branch.branchId),
      )
    )
      throw new OutOfScopeException();
    return this.project(row);
  }
  private root(
    dto: CreateProductDto,
    organizationId: string,
    actorId: string,
  ): Prisma.AcademicProductUncheckedCreateInput {
    return {
      organizationId,
      code: normalizeCatalogCode(dto.code),
      officialName: dto.officialName.trim(),
      nameAr: dto.nameAr.trim(),
      nameEn: dto.nameEn.trim(),
      normalizedOfficialName: normalizeCatalogSearch(dto.officialName),
      normalizedNameAr: normalizeCatalogSearch(dto.nameAr),
      normalizedNameEn: normalizeCatalogSearch(dto.nameEn),
      productTypeId: dto.productTypeId,
      categoryId: dto.categoryId,
      departmentId: dto.departmentId,
      description: dto.description.trim(),
      durationValue: dto.durationValue,
      durationUnitId: dto.durationUnitId,
      studyModeId: dto.studyModeId,
      numberOfTerms: dto.numberOfTerms,
      numberOfSessions: dto.numberOfSessions,
      numberOfHours: dto.numberOfHours,
      internshipIncluded: dto.internshipIncluded,
      trainingIncluded: dto.trainingIncluded,
      finalProjectRequired: dto.finalProjectRequired,
      certificateIncluded: dto.certificateIncluded ?? false,
      instructorEmployeeId: dto.instructorEmployeeId,
      salesScript: dto.salesScript,
      createdBy: actorId,
      updatedBy: actorId,
    };
  }
  private emit(
    name: CatalogEventName,
    c: CallerContext,
    id: string,
    operation: string,
    version: number,
  ) {
    this.events.emit({
      name,
      occurredAt: new Date().toISOString(),
      actor: { accountId: c.accountId },
      target: { type: 'academic-product', id },
      operation,
      payload: { version },
    });
  }
  async create(c: CallerContext, dto: CreateProductDto) {
    const type = await this.repository.findType(dto.productTypeId);
    if (!type?.status || type.status !== 'ACTIVE')
      throw new NotFoundException();
    await this.policy.validate(dto, type.identity);
    const organizationId = await this.organization.organizationId();
    let id: string;
    try {
      id = await this.transactions.run(async (tx) => {
        const row = await this.repository.create(
          this.root(dto, organizationId, c.accountId),
          tx,
        );
        await this.repository.replaceChildren(row.id, dto, tx);
        await tx.productLifecycleEvent.create({
          data: {
            productId: row.id,
            toStatus: 'DRAFT',
            actorId: c.accountId,
            resultingVersion: 1,
          },
        });
        return row.id;
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      )
        throw new DuplicateException();
      throw error;
    }
    const row = await this.repository.find(id);
    if (!row) throw new NotFoundException();
    this.emit(CatalogEventName.ProductCreated, c, id, 'create', 1);
    return this.project(row);
  }
  async update(c: CallerContext, id: string, dto: UpdateProductDto) {
    const current = await this.repository.find(id);
    if (!current) throw new NotFoundException();
    if (
      !c.organizationWide &&
      !current.branches.some((branch) =>
        c.authorizedBranchIds.includes(branch.branchId),
      )
    )
      throw new OutOfScopeException();
    if (current.codeLockedAt && normalizeCatalogCode(dto.code) !== current.code)
      throw new CatalogCodeLockedException();
    const type = await this.repository.findType(dto.productTypeId);
    if (!type?.status || type.status !== 'ACTIVE')
      throw new NotFoundException();
    await this.policy.validate(dto, type.identity);
    const organizationId = current.organizationId;
    await this.transactions.run(async (tx) => {
      const result = await this.repository.update(
        id,
        dto.expectedVersion,
        {
          ...this.root(dto, organizationId, c.accountId),
          createdBy: undefined,
          createdAt: undefined,
        },
        tx,
      );
      if (result.count !== 1)
        throw new VersionConflictException(current.version);
      await this.repository.replaceChildren(id, dto, tx);
    });
    const row = await this.repository.find(id);
    if (!row) throw new NotFoundException();
    this.emit(CatalogEventName.ProductUpdated, c, id, 'update', row.version);
    return this.project(row);
  }
  async readiness(id: string, c?: CallerContext) {
    const row = await this.repository.find(id);
    if (!row) throw new NotFoundException();
    if (
      c &&
      !c.organizationWide &&
      !row.branches.some((branch) =>
        c.authorizedBranchIds.includes(branch.branchId),
      )
    )
      throw new OutOfScopeException();
    return { ...this.policy.readiness(row), version: row.version };
  }
  async status(c: CallerContext, id: string, dto: ProductStatusDto) {
    const required =
      dto.toStatus === 'ARCHIVED'
        ? 'catalog.products.archive'
        : 'catalog.products.activate';
    if (!c.permissionKeys.includes(required)) throw new ForbiddenException();
    const current = await this.repository.find(id);
    if (!current) throw new NotFoundException();
    if (
      !c.organizationWide &&
      !current.branches.some((branch) =>
        c.authorizedBranchIds.includes(branch.branchId),
      )
    )
      throw new OutOfScopeException();
    const readiness = this.policy.readiness(current);
    if (
      (dto.toStatus === 'CLOSED' || dto.toStatus === 'ARCHIVED') &&
      !dto.reason?.trim()
    )
      throw new ValidationException([
        {
          field: 'reason',
          message: 'A reason is required for close or archive',
        },
      ]);
    this.policy.assertTransition(current.status, dto.toStatus, readiness);
    const result = await this.transactions.runSerializable((tx) =>
      this.repository.transition(
        id,
        dto.expectedVersion,
        current.status,
        dto.toStatus,
        c.accountId,
        dto.reason,
        tx,
      ),
    );
    if (result.count !== 1) throw new VersionConflictException(current.version);
    const row = await this.repository.find(id);
    if (!row) throw new NotFoundException();
    this.emit(
      CatalogEventName.ProductStatusChanged,
      c,
      id,
      'status',
      row.version,
    );
    return this.project(row);
  }
  async eligibility(id: string, branchId: string, c?: CallerContext) {
    const row = await this.repository.find(id);
    if (!row) throw new NotFoundException();
    if (c && !c.organizationWide && !c.authorizedBranchIds.includes(branchId))
      throw new OutOfScopeException();
    const branch = await this.organization.resolve('branch', branchId);
    const assigned = row.branches.some((x) => x.branchId === branchId);
    const reasons: string[] = [];
    if (row.status !== 'ACTIVE') reasons.push('PRODUCT_NOT_ACTIVE');
    if (!branch?.active) reasons.push('BRANCH_NOT_ACTIVE');
    if (!assigned) reasons.push('BRANCH_NOT_ASSIGNED');
    return {
      eligible: reasons.length === 0,
      reason: reasons[0] ?? 'ELIGIBLE',
      productVersion: row.version,
      batchable: row.productType.identity === 'PROFESSIONAL_PROGRAM',
    };
  }
}
