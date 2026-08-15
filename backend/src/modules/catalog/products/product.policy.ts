import { Inject, Injectable } from '@nestjs/common';
import {
  ProductStatus,
  ProductTypeIdentity,
} from '../../../../prisma/generated/client';
import {
  DependencyNotFoundException,
  InvalidTransitionException,
  NotReadyException,
  ValidationException,
} from '../../../core/exceptions';
import {
  CATALOG_IDENTITY_PORT,
  CATALOG_ORGANIZATION_PORT,
  type CatalogIdentityPort,
  type CatalogOrganizationPort,
} from '../types/catalog-reference.port';
import {
  assertContiguous,
  assertHttpsUrl,
} from '../types/catalog-normalization';
import type { ProductReadiness } from '../types/catalog.types';
import type { CreateProductDto } from './dto/product.dto';

const TRANSITIONS: Readonly<Record<ProductStatus, readonly ProductStatus[]>> = {
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['HIDDEN', 'CLOSED', 'ARCHIVED'],
  HIDDEN: ['ACTIVE', 'CLOSED', 'ARCHIVED'],
  CLOSED: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: [],
};
@Injectable()
export class ProductPolicy {
  constructor(
    @Inject(CATALOG_IDENTITY_PORT)
    private readonly identity: CatalogIdentityPort,
    @Inject(CATALOG_ORGANIZATION_PORT)
    private readonly organization: CatalogOrganizationPort,
  ) {}
  async validate(dto: CreateProductDto, identity: ProductTypeIdentity) {
    const category = await this.organization.category(dto.categoryId);
    if (!category?.active) throw new DependencyNotFoundException();
    if (dto.departmentId) {
      const department = await this.organization.resolve(
        'department',
        dto.departmentId,
      );
      if (!department?.active) throw new DependencyNotFoundException();
    }
    for (const item of dto.branches ?? []) {
      const branch = await this.organization.resolve('branch', item.branchId);
      if (!branch?.active) throw new DependencyNotFoundException();
    }
    if (
      identity === ProductTypeIdentity.PROFESSIONAL_PROGRAM &&
      !dto.numberOfTerms
    )
      throw new ValidationException([
        {
          field: 'numberOfTerms',
          message: 'Required for Professional Programs',
        },
      ]);
    if (
      identity !== ProductTypeIdentity.PROFESSIONAL_PROGRAM &&
      (dto.numberOfTerms !== undefined ||
        dto.internshipIncluded !== undefined ||
        dto.finalProjectRequired !== undefined)
    )
      throw new ValidationException([
        {
          field: 'academic',
          message: 'Program-only fields are not allowed for this Product Type',
        },
      ]);
    if (
      identity === ProductTypeIdentity.PROFESSIONAL_DIPLOMA &&
      !dto.numberOfSessions
    )
      throw new ValidationException([
        {
          field: 'numberOfSessions',
          message: 'Required for Professional Diplomas',
        },
      ]);
    if (
      identity === ProductTypeIdentity.PROFESSIONAL_PROGRAM &&
      (dto.numberOfHours !== undefined ||
        dto.instructorEmployeeId !== undefined)
    )
      throw new ValidationException([
        {
          field: 'academic',
          message:
            'Course-only fields are not allowed for Professional Programs',
        },
      ]);
    if (identity === ProductTypeIdentity.TRAINING_COURSE) {
      if (
        !dto.numberOfHours ||
        !dto.numberOfSessions ||
        !dto.instructorEmployeeId
      )
        throw new ValidationException([
          {
            field: 'academic',
            message:
              'Hours, sessions and instructor are required for Training Courses',
          },
        ]);
      const instructor = await this.identity.instructor(
        dto.instructorEmployeeId,
      );
      if (!instructor?.active) throw new DependencyNotFoundException();
    }
    if (
      identity !== ProductTypeIdentity.TRAINING_COURSE &&
      dto.instructorEmployeeId
    )
      throw new ValidationException([
        {
          field: 'instructorEmployeeId',
          message: 'Instructor is allowed only for Training Courses',
        },
      ]);
    const content = dto.content ?? [];
    for (const kind of new Set(content.map((x) => x.kind)))
      assertContiguous(
        content
          .filter((x) => x.kind === kind)
          .map((x) => x.position)
          .sort((a, b) => a - b),
      );
    const assets = dto.assets ?? [];
    for (const kind of new Set(assets.map((x) => x.kind)))
      assertContiguous(
        assets
          .filter((x) => x.kind === kind)
          .map((x) => x.position)
          .sort((a, b) => a - b),
      );
    for (const asset of assets) assertHttpsUrl(asset.url);
    if (assets.filter((asset) => asset.kind === 'PRIMARY').length > 1)
      throw new ValidationException([
        { field: 'assets', message: 'Only one primary image is allowed' },
      ]);
    if (assets.filter((asset) => asset.kind === 'GALLERY').length > 8)
      throw new ValidationException([
        { field: 'assets', message: 'Gallery accepts at most eight images' },
      ]);
    for (const asset of assets) {
      if (
        (asset.kind === 'PRIMARY' || asset.kind === 'GALLERY') &&
        asset.mimeType &&
        !asset.mimeType.startsWith('image/')
      )
        throw new ValidationException([
          {
            field: 'assets',
            message: 'Image assets require an image MIME type',
          },
        ]);
      if (
        asset.kind === 'BROCHURE' &&
        asset.mimeType &&
        asset.mimeType !== 'application/pdf'
      )
        throw new ValidationException([
          { field: 'assets', message: 'Brochures must be PDF files' },
        ]);
    }
    if (dto.pricing) {
      if (
        dto.pricing.installmentAvailable &&
        dto.pricing.installmentMinCount > dto.pricing.installmentMaxCount
      )
        throw new ValidationException([
          {
            field: 'pricing.installmentMaxCount',
            message: 'must be greater than or equal to installmentMinCount',
          },
        ]);
      const values = Object.values(dto.pricing).filter(
        (x): x is { amount: string; currency: string; precision: number } =>
          typeof x === 'object',
      );
      if (
        values.some(
          (x) =>
            x.currency !== values[0]?.currency ||
            x.precision !== values[0]?.precision,
        )
      )
        throw new ValidationException([
          {
            field: 'pricing',
            message: 'All Money values must use one currency and precision',
          },
        ]);
    }
  }
  readiness(product: {
    description: string;
    pricing: unknown;
    branches: Array<{ role: string }>;
    productType: { identity: ProductTypeIdentity };
    numberOfTerms: number | null;
    numberOfSessions: number | null;
    numberOfHours: number | null;
    instructorEmployeeId: string | null;
  }): ProductReadiness {
    const issues = [] as ProductReadiness['issues'];
    if (!product.description.trim())
      issues.push({
        code: 'DESCRIPTION_REQUIRED',
        field: 'description',
        message: 'Description is required',
      });
    if (!product.pricing)
      issues.push({
        code: 'PRICING_REQUIRED',
        field: 'pricing',
        message: 'Pricing is required',
      });
    if (!product.branches.some((branch) => branch.role === 'REGISTRATION'))
      issues.push({
        code: 'BRANCH_REQUIRED',
        field: 'branches',
        message: 'At least one registration branch is required',
      });
    if (
      product.productType.identity === 'PROFESSIONAL_PROGRAM' &&
      !product.numberOfTerms
    )
      issues.push({
        code: 'TERMS_REQUIRED',
        field: 'numberOfTerms',
        message: 'Terms are required',
      });
    if (
      product.productType.identity === 'TRAINING_COURSE' &&
      (!product.numberOfHours ||
        !product.numberOfSessions ||
        !product.instructorEmployeeId)
    )
      issues.push({
        code: 'COURSE_PROFILE_REQUIRED',
        field: 'academic',
        message: 'Course profile is incomplete',
      });
    return { ready: issues.length === 0, issues };
  }
  assertTransition(
    from: ProductStatus,
    to: ProductStatus,
    readiness?: ProductReadiness,
  ) {
    if (!TRANSITIONS[from].includes(to)) throw new InvalidTransitionException();
    if (to === 'ACTIVE' && !readiness?.ready) throw new NotReadyException();
  }
}
