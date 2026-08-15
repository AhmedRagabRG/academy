import { Injectable } from '@nestjs/common';
import { ValidationException } from '../../../core/exceptions';
import { toMinorUnits } from '../../../shared/utils/money.util';
import type {
  BatchFinancialProfileDto,
  BatchMoneyDto,
} from '../batches/dto/batch-financial.dto';

const parseValue = (amount: string, precision: number): bigint =>
  toMinorUnits({ amount, currency: '', precision });

@Injectable()
export class BatchFinancialPolicy {
  minor(money: BatchMoneyDto): bigint {
    return toMinorUnits(money);
  }

  validate(profile: BatchFinancialProfileDto): void {
    const details: Array<{ field: string; message: string }> = [];
    const money = [profile.programPrice, profile.registrationFee];
    if (money.some((value) => this.minor(value) < 0n))
      details.push({
        field: 'financialProfile',
        message: 'القيم المالية يجب ألا تكون سالبة',
      });
    if (profile.programPrice.currency !== profile.registrationFee.currency)
      details.push({ field: 'financialProfile', message: 'يجب توحيد العملة' });
    if (profile.programPrice.precision !== profile.registrationFee.precision)
      details.push({
        field: 'financialProfile',
        message: 'يجب توحيد الدقة المالية',
      });
    const planPositions = profile.installmentPlans
      .map((plan) => plan.position)
      .sort((a, b) => a - b);
    if (planPositions.some((value, index) => value !== index + 1))
      details.push({
        field: 'installmentPlans',
        message: 'ترتيب الخطط يجب أن يكون متصلاً',
      });
    for (const [planIndex, plan] of profile.installmentPlans.entries()) {
      const positions = plan.installments
        .map((item) => item.position)
        .sort((a, b) => a - b);
      if (positions.some((value, index) => value !== index + 1))
        details.push({
          field: `installmentPlans.${planIndex}.installments`,
          message: 'ترتيب الأقساط يجب أن يكون متصلاً',
        });
      const values = plan.installments.map((item) =>
        parseValue(item.value, profile.programPrice.precision),
      );
      if (values.some((value) => value <= 0n))
        details.push({
          field: `installmentPlans.${planIndex}.installments`,
          message: 'قيمة القسط يجب أن تكون موجبة',
        });
      if (
        plan.basis === 'percentage' &&
        values.reduce((sum, value) => sum + value, 0n) !==
          100n * 10n ** BigInt(profile.programPrice.precision)
      )
        details.push({
          field: `installmentPlans.${planIndex}.installments`,
          message: 'نسب الأقساط يجب أن تساوي 100',
        });
    }
    for (const [index, offer] of profile.offers.entries()) {
      const value = parseValue(offer.value, offer.precision);
      if (value <= 0n)
        details.push({
          field: `offers.${index}.value`,
          message: 'قيمة العرض يجب أن تكون موجبة',
        });
      if (
        offer.valueType === 'percentage' &&
        value > 100n * 10n ** BigInt(offer.precision)
      )
        details.push({
          field: `offers.${index}.value`,
          message: 'النسبة لا تتجاوز 100',
        });
      if (offer.startDate && offer.endDate && offer.endDate < offer.startDate)
        details.push({
          field: `offers.${index}.endDate`,
          message: 'تاريخ النهاية يسبق البداية',
        });
      if (offer.valueType === 'amount' && !offer.currency)
        details.push({
          field: `offers.${index}.currency`,
          message: 'العملة مطلوبة للعرض المالي',
        });
    }
    if (
      profile.installmentsEnabled &&
      !profile.installmentPlans.some((plan) => plan.status === 'active')
    )
      details.push({
        field: 'installmentPlans',
        message: 'يجب توفير خطة أقساط نشطة',
      });
    if (details.length) throw new ValidationException(details);
  }
}
