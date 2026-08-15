import { Injectable } from '@nestjs/common';
import type { InstallmentFrequency } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';
import { eligibilityFor } from '../lookups/finance-policy.config';

/**
 * Schedule shape only. Whether an offering may carry a plan at all, and the
 * upper bound on `count`, come from the published installment eligibility so
 * the rule the API advertises is the rule the server enforces.
 */
@Injectable()
export class InstallmentSchedulePolicy {
  constructor(private readonly prisma: PrismaService) {}

  async policyForOffering(offeringId: string, offeringKind: string) {
    const productId =
      offeringKind === 'PROFESSIONAL_PROGRAM'
        ? (
            await this.prisma.programBatch.findUnique({
              where: { id: offeringId },
              select: { programId: true },
            })
          )?.programId
        : offeringId;
    if (!productId) return null;
    return this.prisma.productPricing.findUnique({
      where: { productId },
      select: {
        installmentAvailable: true,
        installmentMinCount: true,
        installmentMaxCount: true,
        installmentFrequency: true,
      },
    });
  }

  toWireFrequency(value: InstallmentFrequency): 'weekly' | 'monthly' | 'bimonthly' {
    return value.toLowerCase() as 'weekly' | 'monthly' | 'bimonthly';
  }

  generateRecurringDueDates(
    firstDueDate: string,
    count: number,
    frequency: 'weekly' | 'monthly' | 'bimonthly',
  ): string[] {
    if (frequency === 'weekly') {
      const origin = new Date(`${firstDueDate}T00:00:00Z`);
      return Array.from({ length: count }, (_, index) => {
        const date = new Date(origin);
        date.setUTCDate(origin.getUTCDate() + index * 7);
        return date.toISOString().slice(0, 10);
      });
    }
    return this.generateMonthlyDueDates(firstDueDate, count, frequency === 'bimonthly' ? 2 : 1);
  }
  /**
   * Adds whole months to the first due date, clamping to the last day of a
   * shorter month.
   *
   * `setUTCMonth` overflows rather than clamps — asking for 31 April yields
   * 1 May — which would silently move a due date into the following month and
   * shift when the installment falls overdue. Each date is also computed from
   * the original day-of-month, so a single short month cannot drag every
   * later installment backwards.
   */
  generateMonthlyDueDates(firstDueDate: string, count: number, monthStep = 1): string[] {
    const origin = new Date(`${firstDueDate}T00:00:00Z`);
    const originDay = origin.getUTCDate();
    const dates: string[] = [];

    for (let index = 0; index < count; index += 1) {
      const year = origin.getUTCFullYear();
      const month = origin.getUTCMonth() + index * monthStep;
      // Day 0 of the next month is the last day of this one.
      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const day = Math.min(originDay, daysInMonth);
      dates.push(
        new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10),
      );
    }
    return dates;
  }

  validateCustomDueDatesCount(
    customDueDates: string[],
    expectedCount: number,
  ): boolean {
    return customDueDates.length === expectedCount;
  }

  validateOfferingKindEligibility(offeringKind: string): boolean {
    return eligibilityFor(offeringKind).allowsPlan;
  }

  validateInstallmentCount(count: number, offeringKind: string): boolean {
    const { allowsPlan, maxCount } = eligibilityFor(offeringKind);
    if (!allowsPlan) return false;
    return Number.isInteger(count) && count >= 1 && count <= maxCount;
  }

  getInstallmentBounds(
    offeringKind: string,
  ): { min: number; max: number } | null {
    const { allowsPlan, maxCount } = eligibilityFor(offeringKind);
    return allowsPlan ? { min: 1, max: maxCount } : null;
  }

  validateDueDatesNotInPast(dueDates: string[]): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return dueDates.every((date) => date >= today);
  }
}
