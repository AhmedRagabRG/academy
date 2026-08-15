import { describe, expect, it } from '@jest/globals';
import { InstallmentSchedulePolicy } from '../../../src/modules/student-finance/installments/installment-schedule.policy';

const policy = new InstallmentSchedulePolicy();

describe('InstallmentSchedulePolicy', () => {
  describe('generateMonthlyDueDates', () => {
    it('advances one whole month per installment', () => {
      expect(policy.generateMonthlyDueDates('2026-09-01', 4)).toEqual([
        '2026-09-01',
        '2026-10-01',
        '2026-11-01',
        '2026-12-01',
      ]);
    });

    it('rolls across a year boundary', () => {
      expect(policy.generateMonthlyDueDates('2026-11-15', 3)).toEqual([
        '2026-11-15',
        '2026-12-15',
        '2027-01-15',
      ]);
    });

    it('does not compound end-of-month clamping', () => {
      // Every date is computed from the origin, so a short February clamps
      // once and March still lands on the 31st.
      const dates = policy.generateMonthlyDueDates('2026-01-31', 4);
      expect(dates[0]).toBe('2026-01-31');
      expect(dates[3]).toBe('2026-04-30');
    });

    it('clamps into February, including a leap year', () => {
      expect(policy.generateMonthlyDueDates('2026-01-31', 2)[1]).toBe('2026-02-28');
      expect(policy.generateMonthlyDueDates('2028-01-31', 2)[1]).toBe('2028-02-29');
    });

    it('recovers the original day after a short month', () => {
      // Feb clamps to the 28th, but March must return to the 31st rather
      // than inheriting the clamped day.
      const dates = policy.generateMonthlyDueDates('2026-01-31', 3);
      expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    });

    it('returns exactly `count` dates', () => {
      expect(policy.generateMonthlyDueDates('2026-01-01', 12)).toHaveLength(12);
    });
  });

  describe('configured frequency', () => {
    it('generates weekly due dates', () => {
      expect(policy.generateRecurringDueDates('2026-09-01', 3, 'weekly')).toEqual([
        '2026-09-01',
        '2026-09-08',
        '2026-09-15',
      ]);
    });

    it('generates due dates every two months', () => {
      expect(policy.generateRecurringDueDates('2026-09-01', 3, 'bimonthly')).toEqual([
        '2026-09-01',
        '2026-11-01',
        '2027-01-01',
      ]);
    });
  });

  describe('offering-kind eligibility', () => {
    it('permits plans for programmes and diplomas', () => {
      expect(policy.validateOfferingKindEligibility('PROFESSIONAL_PROGRAM')).toBe(true);
      expect(policy.validateOfferingKindEligibility('PROFESSIONAL_DIPLOMA')).toBe(true);
    });

    it('refuses a plan for a training course, which is paid in full', () => {
      expect(policy.validateOfferingKindEligibility('TRAINING_COURSE')).toBe(false);
    });

    it('refuses an offering kind it does not recognise', () => {
      expect(policy.validateOfferingKindEligibility('CERTIFICATE_PROGRAM')).toBe(false);
    });
  });

  describe('validateInstallmentCount', () => {
    it('accepts a count inside the published maximum', () => {
      expect(policy.validateInstallmentCount(12, 'PROFESSIONAL_PROGRAM')).toBe(true);
    });

    it('refuses a count above the published maximum', () => {
      expect(policy.validateInstallmentCount(13, 'PROFESSIONAL_PROGRAM')).toBe(false);
    });

    it('refuses zero, negative and fractional counts', () => {
      expect(policy.validateInstallmentCount(0, 'PROFESSIONAL_PROGRAM')).toBe(false);
      expect(policy.validateInstallmentCount(-1, 'PROFESSIONAL_PROGRAM')).toBe(false);
      expect(policy.validateInstallmentCount(2.5, 'PROFESSIONAL_PROGRAM')).toBe(false);
    });

    it('refuses any count for an offering that allows no plan', () => {
      expect(policy.validateInstallmentCount(1, 'TRAINING_COURSE')).toBe(false);
    });
  });

  describe('getInstallmentBounds', () => {
    it('reports bounds for an eligible offering', () => {
      expect(policy.getInstallmentBounds('PROFESSIONAL_PROGRAM')).toEqual({
        min: 1,
        max: 12,
      });
    });

    it('reports no bounds for an ineligible offering', () => {
      expect(policy.getInstallmentBounds('TRAINING_COURSE')).toBeNull();
    });
  });

  describe('validateCustomDueDatesCount', () => {
    it('requires one date per installment', () => {
      expect(policy.validateCustomDueDatesCount(['2026-01-01'], 1)).toBe(true);
      expect(policy.validateCustomDueDatesCount(['2026-01-01'], 2)).toBe(false);
    });
  });
});
