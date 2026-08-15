import { Injectable } from '@nestjs/common';
import { ValidationException } from '../../../core/exceptions';
import type { Money } from '../../../shared/types/money';
import { fromMinorUnits, toMinorUnits } from '../../../shared/utils/money.util';
import type { DiscountMode } from '../types/admissions.types';

export interface AdmissionFinancialInput {
  productPrice: Money;
  registrationFees: Money;
  fileOpeningFees?: Money;
  discountMode: DiscountMode;
  discountValue?: string;
  discountPrecision?: number;
}

export interface AdmissionFinancialCalculation {
  productPrice: Money;
  registrationFees: Money;
  discountMode: DiscountMode;
  discountPercentage?: string;
  discountAmount: Money;
  requiredAmount: Money;
  productPriceMinor: bigint;
  registrationFeesMinor: bigint;
  discountAmountMinor: bigint;
  requiredAmountMinor: bigint;
}

@Injectable()
export class AdmissionFinancialPolicy {
  calculate(input: AdmissionFinancialInput): AdmissionFinancialCalculation {
    this.assertCompatible(input);
    const productPriceMinor = toMinorUnits(input.productPrice);
    const registrationFeesMinor =
      toMinorUnits(input.registrationFees) +
      (input.fileOpeningFees ? toMinorUnits(input.fileOpeningFees) : 0n);
    const subtotal = productPriceMinor + registrationFeesMinor;
    const discountPrecision = input.discountPrecision ?? 4;
    let discountAmountMinor = 0n;
    let discountPercentage: string | undefined;

    if (input.discountMode === 'percentage') {
      const percentage = input.discountValue ?? '';
      const scaled = this.parseUnsignedDecimal(
        percentage,
        discountPrecision,
        'discountValue',
      );
      const hundred = 100n * 10n ** BigInt(discountPrecision);
      if (scaled > hundred)
        throw new ValidationException([
          { field: 'discountValue', message: 'نسبة الخصم يجب ألا تتجاوز 100' },
        ]);
      discountAmountMinor = this.roundHalfUp(subtotal * scaled, hundred);
      discountPercentage = percentage;
    } else if (input.discountMode === 'amount') {
      discountAmountMinor = this.parseUnsignedDecimal(
        input.discountValue ?? '',
        input.productPrice.precision,
        'discountValue',
      );
      if (discountAmountMinor > subtotal)
        throw new ValidationException([
          { field: 'discountValue', message: 'قيمة الخصم تتجاوز الإجمالي' },
        ]);
    } else if (
      input.discountValue &&
      this.parseUnsignedDecimal(
        input.discountValue,
        discountPrecision,
        'discountValue',
      ) !== 0n
    ) {
      throw new ValidationException([
        {
          field: 'discountValue',
          message: 'لا تقبل قيمة خصم عند اختيار بدون خصم',
        },
      ]);
    }

    const requiredAmountMinor =
      subtotal > discountAmountMinor ? subtotal - discountAmountMinor : 0n;
    const { currency, precision } = input.productPrice;
    return {
      productPrice: fromMinorUnits(productPriceMinor, currency, precision),
      registrationFees: fromMinorUnits(
        registrationFeesMinor,
        currency,
        precision,
      ),
      discountMode: input.discountMode,
      ...(discountPercentage ? { discountPercentage } : {}),
      discountAmount: fromMinorUnits(discountAmountMinor, currency, precision),
      requiredAmount: fromMinorUnits(requiredAmountMinor, currency, precision),
      productPriceMinor,
      registrationFeesMinor,
      discountAmountMinor,
      requiredAmountMinor,
    };
  }

  private assertCompatible(input: AdmissionFinancialInput): void {
    const amounts = [
      input.productPrice,
      input.registrationFees,
      ...(input.fileOpeningFees ? [input.fileOpeningFees] : []),
    ];
    const details: Array<{ field: string; message: string }> = [];
    if (amounts.some((money) => toMinorUnits(money) < 0n))
      details.push({
        field: 'financial',
        message: 'القيم المالية يجب ألا تكون سالبة',
      });
    if (amounts.some((money) => money.currency !== input.productPrice.currency))
      details.push({
        field: 'financial.currency',
        message: 'يجب توحيد العملة',
      });
    if (
      amounts.some((money) => money.precision !== input.productPrice.precision)
    )
      details.push({
        field: 'financial.precision',
        message: 'يجب توحيد الدقة المالية',
      });
    if (details.length) throw new ValidationException(details);
  }

  private parseUnsignedDecimal(
    value: string,
    precision: number,
    field: string,
  ): bigint {
    if (!/^\d+(?:\.\d+)?$/.test(value) || precision < 0 || precision > 6)
      throw new ValidationException([
        { field, message: 'قيمة مالية غير صالحة' },
      ]);
    const [whole, fraction = ''] = value.split('.');
    if (fraction.length > precision)
      throw new ValidationException([
        { field, message: 'الدقة المالية غير صالحة' },
      ]);
    return BigInt(`${whole}${fraction.padEnd(precision, '0')}`);
  }

  private roundHalfUp(numerator: bigint, denominator: bigint): bigint {
    return (numerator + denominator / 2n) / denominator;
  }
}
