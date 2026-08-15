import type { Prisma } from '../../../../prisma/generated/client';
import { BATCHABLE } from '../types/catalog.types';
import { minorToMoney } from '../types/catalog-normalization';
import { productInclude } from '../products/product.repository';
export type ProductAggregate = Prisma.AcademicProductGetPayload<{
  include: typeof productInclude;
}>;
export function mapProduct(row: ProductAggregate) {
  const pricing = row.pricing
    ? {
        currency: row.pricing.currency,
        precision: row.pricing.precision,
        basePrice: minorToMoney(
          row.pricing.basePrice,
          row.pricing.currency,
          row.pricing.precision,
        ),
        registrationFees: minorToMoney(
          row.pricing.registrationFees,
          row.pricing.currency,
          row.pricing.precision,
        ),
        certificateFees: minorToMoney(
          row.pricing.certificateFees,
          row.pricing.currency,
          row.pricing.precision,
        ),
        trainingFees: minorToMoney(
          row.pricing.trainingFees,
          row.pricing.currency,
          row.pricing.precision,
        ),
        cardFees: minorToMoney(
          row.pricing.cardFees,
          row.pricing.currency,
          row.pricing.precision,
        ),
        examFees: minorToMoney(
          row.pricing.examFees,
          row.pricing.currency,
          row.pricing.precision,
        ),
        additionalFees: minorToMoney(
          row.pricing.additionalFees,
          row.pricing.currency,
          row.pricing.precision,
        ),
        discount: minorToMoney(
          row.pricing.discount,
          row.pricing.currency,
          row.pricing.precision,
        ),
        scholarship: minorToMoney(
          row.pricing.scholarship,
          row.pricing.currency,
          row.pricing.precision,
        ),
        installmentAvailable: row.pricing.installmentAvailable,
        installmentMinCount: row.pricing.installmentMinCount,
        installmentMaxCount: row.pricing.installmentMaxCount,
        installmentFrequency: row.pricing.installmentFrequency,
      }
    : null;
  return {
    ...row,
    pricing,
    productType: {
      ...row.productType,
      batchable: BATCHABLE[row.productType.identity],
    },
  };
}
