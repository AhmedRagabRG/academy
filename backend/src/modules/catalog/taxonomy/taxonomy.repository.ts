import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';
@Injectable()
export class TaxonomyRepository {
  constructor(private readonly prisma: PrismaService) {}
  list() {
    return this.prisma.productType.findMany({
      include: { fields: { orderBy: { position: 'asc' } } },
      orderBy: { identity: 'asc' },
    });
  }
  find(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).productType.findUnique({
      where: { id },
      include: { fields: { orderBy: { position: 'asc' } } },
    });
  }
  countProducts(id: string) {
    return this.prisma.academicProduct.count({
      where: { productTypeId: id, status: { not: 'ARCHIVED' } },
    });
  }
  update(
    id: string,
    version: number,
    data: Prisma.ProductTypeUncheckedUpdateManyInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.productType.updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
  }
  async replaceFields(
    id: string,
    fields: Array<{
      key: string;
      label: string;
      kind: 'NUMBER' | 'OPTION' | 'BOOLEAN' | 'REFERENCE';
      required: boolean;
      position: number;
    }>,
    tx: Prisma.TransactionClient,
  ) {
    await tx.productTypeField.deleteMany({ where: { productTypeId: id } });
    if (fields.length)
      await tx.productTypeField.createMany({
        data: fields.map((x) => ({ ...x, productTypeId: id })),
      });
  }
}
