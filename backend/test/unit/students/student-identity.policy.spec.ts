import 'reflect-metadata';
import { StudentIdentityPolicy } from '../../../src/modules/students/students/student-identity.policy';
import type { StudentIdentityRules } from '../../../src/modules/students/types/students.types';

const rules: StudentIdentityRules = {
  nationalIdPattern: '^\\d{14}$',
  phonePattern: '^01\\d{9}$',
  minorAgeThreshold: 18,
  minimumGraduationAge: 16,
};

const NOW = new Date('2026-08-04T00:00:00.000Z');

const valid = {
  fullName: 'محمد أحمد علي',
  primaryPhone: '01012345678',
  address: 'القاهرة، مصر',
  dateOfBirth: '1998-01-01',
  graduationYear: 2020,
  nationalId: '29801011234567',
};

const detailFields = (error: unknown): string[] =>
  (error as { details?: { field: string }[] }).details?.map((d) => d.field) ??
  [];

describe('StudentIdentityPolicy', () => {
  const policy = new StudentIdentityPolicy();

  it('accepts a complete adult identity and folds the name for search', () => {
    const result = policy.validate(valid, rules, NOW);
    expect(result.primaryPhone).toBe('01012345678');
    expect(result.nationalId).toBe('29801011234567');
    // أ folds to ا so a differently-typed query still matches.
    expect(result.searchName).toContain('محمد');
    expect(result.searchName).not.toContain('أ');
  });

  it('folds Arabic-Indic digits in phone and national id', () => {
    const result = policy.validate(
      { ...valid, primaryPhone: '٠١٠١٢٣٤٥٦٧٨' },
      rules,
      NOW,
    );
    expect(result.primaryPhone).toBe('01012345678');
  });

  it('requires a guardian phone below the minor age threshold', () => {
    expect(() =>
      policy.validate(
        { ...valid, dateOfBirth: '2015-01-01', graduationYear: 2026 },
        rules,
        NOW,
      ),
    ).toThrow();

    try {
      policy.validate(
        { ...valid, dateOfBirth: '2015-01-01', graduationYear: 2026 },
        rules,
        NOW,
      );
    } catch (error) {
      expect(detailFields(error)).toContain('identity.guardianPhone');
    }
  });

  it('accepts a minor once a guardian phone is supplied', () => {
    // Born 2009 → age 17 at NOW, so still a minor, and 2025 satisfies both
    // graduation-year bounds (>= 2009+16 and <= 2026).
    const result = policy.validate(
      {
        ...valid,
        dateOfBirth: '2009-01-01',
        graduationYear: 2025,
        guardianPhone: '01098765432',
      },
      rules,
      NOW,
    );
    expect(result.guardianPhone).toBe('01098765432');
  });

  it('requires an alternative reason when the national id is absent', () => {
    try {
      policy.validate({ ...valid, nationalId: undefined }, rules, NOW);
      throw new Error('should have thrown');
    } catch (error) {
      expect(detailFields(error)).toContain(
        'identity.alternativeIdentityReason',
      );
    }
  });

  it('accepts an absent national id when a reason is given', () => {
    const result = policy.validate(
      {
        ...valid,
        nationalId: undefined,
        alternativeIdentityReason: 'جواز سفر',
      },
      rules,
      NOW,
    );
    expect(result.nationalId).toBeUndefined();
  });

  it('rejects a future graduation year but accepts the current year', () => {
    expect(() =>
      policy.validate({ ...valid, graduationYear: 2027 }, rules, NOW),
    ).toThrow();
    expect(() =>
      policy.validate({ ...valid, graduationYear: 2026 }, rules, NOW),
    ).not.toThrow();
  });

  it('rejects a graduation year below birth year plus the minimum age', () => {
    // Born 1998, minimum graduation age 16 → 2014 is the earliest valid year.
    expect(() =>
      policy.validate({ ...valid, graduationYear: 2014 }, rules, NOW),
    ).not.toThrow();
    expect(() =>
      policy.validate({ ...valid, graduationYear: 2013 }, rules, NOW),
    ).toThrow();
  });

  it('rejects a future birth date', () => {
    try {
      policy.validate({ ...valid, dateOfBirth: '2030-01-01' }, rules, NOW);
      throw new Error('should have thrown');
    } catch (error) {
      expect(detailFields(error)).toContain('identity.dateOfBirth');
    }
  });

  it('rejects a malformed phone and a malformed national id', () => {
    try {
      policy.validate(
        { ...valid, primaryPhone: '12345', nationalId: '123' },
        rules,
        NOW,
      );
      throw new Error('should have thrown');
    } catch (error) {
      const fields = detailFields(error);
      expect(fields).toContain('identity.primaryPhone');
      expect(fields).toContain('identity.nationalId');
    }
  });

  it('collects every finding in one response rather than failing fast', () => {
    try {
      policy.validate(
        { ...valid, fullName: 'م', primaryPhone: 'x', address: '' },
        rules,
        NOW,
      );
      throw new Error('should have thrown');
    } catch (error) {
      expect(detailFields(error).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('honours configured rules rather than hardcoded values', () => {
    const relaxed: StudentIdentityRules = {
      ...rules,
      phonePattern: '^\\d{5}$',
      minorAgeThreshold: 0,
    };
    expect(() =>
      policy.validate({ ...valid, primaryPhone: '12345' }, relaxed, NOW),
    ).not.toThrow();
  });
});
