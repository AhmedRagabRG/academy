import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  ProductStatus,
} from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';
import type { CreateProductDto, ProductListDto } from './dto/product.dto';
import { moneyToMinor } from '../types/catalog-normalization';

export const productInclude = {
  productType: {
    include: { fields: { orderBy: { position: 'asc' as const } } },
  },
  pricing: true,
  branches: true,
  content: { orderBy: { position: 'asc' as const } },
  assets: { orderBy: { position: 'asc' as const } },
  lifecycle: { orderBy: { occurredAt: 'asc' as const } },
} satisfies Prisma.AcademicProductInclude;
@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}
  find(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).academicProduct.findUnique({
      where: { id },
      include: productInclude,
    });
  }
  findType(id: string) {
    return this.prisma.productType.findUnique({
      where: { id },
      include: { fields: { orderBy: { position: 'asc' } } },
    });
  }
  countByCategory(categoryId: string) {
    return this.prisma.academicProduct.count({
      where: { categoryId, status: { not: 'ARCHIVED' } },
    });
  }
  async list(q: ProductListDto, scopeBranchIds?: string[]) {
    const page = q.page ?? 1,
      take = q.pageSize ?? 20;
    const where: Prisma.AcademicProductWhereInput = {
      ...(q.search
        ? {
            OR: [
              {
                code: { contains: q.search.toUpperCase(), mode: 'insensitive' },
              },
              { normalizedOfficialName: { contains: q.search } },
              { normalizedNameAr: { contains: q.search } },
              { normalizedNameEn: { contains: q.search } },
            ],
          }
        : {}),
      ...(q.statuses?.length ? { status: { in: q.statuses } } : {}),
      ...(q.typeIds?.length ? { productTypeId: { in: q.typeIds } } : {}),
      ...(q.categoryIds?.length ? { categoryId: { in: q.categoryIds } } : {}),
      ...(q.departmentIds?.length
        ? { departmentId: { in: q.departmentIds } }
        : {}),
      ...(q.studyModeIds?.length
        ? { studyModeId: { in: q.studyModeIds } }
        : {}),
      ...(q.branchIds?.length
        ? { branches: { some: { branchId: { in: q.branchIds } } } }
        : scopeBranchIds
          ? { branches: { some: { branchId: { in: scopeBranchIds } } } }
          : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.academicProduct.findMany({
        where,
        skip: (page - 1) * take,
        take,
        orderBy: [
          q.sort === 'price'
            ? { pricing: { basePrice: q.sortOrder ?? 'asc' } }
            : {
                [q.sort === 'name' ? 'officialName' : (q.sort ?? 'updatedAt')]:
                  q.sortOrder ?? 'desc',
              },
          { id: 'asc' },
        ],
        include: productInclude,
      }),
      this.prisma.academicProduct.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    };
  }
  create(
    data: Prisma.AcademicProductUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.academicProduct.create({ data });
  }
  update(
    id: string,
    version: number,
    data: Prisma.AcademicProductUncheckedUpdateManyInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.academicProduct.updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
  }
  async replaceChildren(
    id: string,
    dto: CreateProductDto,
    tx: Prisma.TransactionClient,
  ) {
    await Promise.all([
      tx.productPricing.deleteMany({ where: { productId: id } }),
      tx.productBranchAssignment.deleteMany({ where: { productId: id } }),
      tx.productContentItem.deleteMany({ where: { productId: id } }),
      tx.productAsset.deleteMany({ where: { productId: id } }),
    ]);
    if (dto.pricing) {
      const p = dto.pricing;
      const value = (m: typeof p.basePrice) =>
        moneyToMinor(m.amount, m.precision);
      await tx.productPricing.create({
        data: {
          productId: id,
          currency: p.basePrice.currency,
          precision: p.basePrice.precision,
          basePrice: value(p.basePrice),
          registrationFees: value(p.registrationFees),
          certificateFees: value(p.certificateFees),
          trainingFees: value(p.trainingFees),
          cardFees: value(p.cardFees),
          examFees: value(p.examFees),
          additionalFees: value(p.additionalFees),
          discount: value(p.discount),
          scholarship: value(p.scholarship),
          installmentAvailable: p.installmentAvailable,
          installmentMinCount: p.installmentMinCount,
          installmentMaxCount: p.installmentMaxCount,
          installmentFrequency: p.installmentFrequency,
        },
      });
    }
    if (dto.branches?.length)
      await tx.productBranchAssignment.createMany({
        data: dto.branches.map((x) => ({ productId: id, ...x })),
      });
    if (dto.content?.length)
      await tx.productContentItem.createMany({
        data: dto.content.map((x) => ({
          id: x.id,
          productId: id,
          kind: x.kind,
          title: x.title,
          description: x.description,
          required: x.required,
          position: x.position,
        })),
      });
    if (dto.assets?.length)
      await tx.productAsset.createMany({
        data: dto.assets.map((x) => ({
          id: x.id,
          productId: id,
          kind: x.kind,
          fileId: x.fileId,
          fileName: x.fileName,
          originalName: x.originalName,
          mimeType: x.mimeType,
          size: x.size,
          url: x.url,
          label: x.label,
          position: x.position,
        })),
      });
  }
  transition(
    id: string,
    version: number,
    fromStatus: ProductStatus,
    status: ProductStatus,
    actorId: string,
    reason: string | undefined,
    tx: Prisma.TransactionClient,
  ) {
    return tx.academicProduct
      .updateMany({
        where: { id, version, status: fromStatus },
        data: {
          status,
          version: { increment: 1 },
          codeLockedAt: status === 'ACTIVE' ? new Date() : undefined,
          archivedAt: status === 'ARCHIVED' ? new Date() : null,
          updatedBy: actorId,
        },
      })
      .then(async (r) => {
        if (r.count)
          await tx.productLifecycleEvent.create({
            data: {
              productId: id,
              toStatus: status,
              fromStatus,
              reason,
              actorId,
              resultingVersion: version + 1,
            },
          });
        return r;
      });
  }
}
