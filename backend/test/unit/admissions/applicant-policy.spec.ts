import { ApplicantPolicy } from '../../../src/modules/admissions/applicants/applicant.policy';

describe('ApplicantPolicy', () => {
  const policy = new ApplicantPolicy();
  const rules = {
    minorAge: 18,
    minimumGraduationAge: 15,
    phonePattern: '^01\\d{9}$',
    nationalIdPattern: '^\\d{14}$',
  };
  const valid = {
    fullName: '  مُحمد   أحمد  ',
    primaryPhone: '+20 1012345678',
    nationalId: '٢٩٨٠١٠١١٢٣٤٥٦٧',
    dateOfBirth: '1998-01-01',
    graduationYear: 2018,
  };

  it('normalizes Arabic digits, whitespace, phone, and national ID', () => {
    expect(policy.validate(valid, rules, new Date('2026-01-01'))).toMatchObject(
      {
        fullName: 'مُحمد أحمد',
        normalizedPrimaryPhone: '01012345678',
        normalizedNationalId: '29801011234567',
      },
    );
  });

  it('requires a guardian phone for a minor', () => {
    expect(() =>
      policy.validate(
        { ...valid, dateOfBirth: '2012-01-01', graduationYear: 2026 },
        rules,
        new Date('2026-01-01'),
      ),
    ).toThrow();
  });

  it('accepts an alternative identity reason and rejects impossible graduation years', () => {
    expect(
      policy.validate(
        {
          ...valid,
          nationalId: undefined,
          alternativeIdentityReason: 'Passport supplied',
        },
        rules,
        new Date('2026-01-01'),
      ).normalizedNationalId,
    ).toBeUndefined();
    expect(() =>
      policy.validate(
        { ...valid, graduationYear: 2030 },
        rules,
        new Date('2026-01-01'),
      ),
    ).toThrow();
  });
});
