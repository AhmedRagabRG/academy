import { BatchPolicy } from '../../../src/modules/program-batches/batches/batch.policy';

describe('Batch eligibility reasons', () => {
  const policy = new BatchPolicy();

  it('returns no reasons for an eligible batch', () => {
    expect(
      policy.eligibilityReasons({
        programAvailable: true,
        registrationOpen: true,
        today: '2026-08-05',
        registrationStartDate: '2026-08-01',
        registrationEndDate: '2026-08-15',
        availableSeats: 1,
        branchEligible: true,
      }),
    ).toEqual([]);
  });

  it('returns every deduplicated refusal reason', () => {
    expect(
      policy.eligibilityReasons({
        programAvailable: false,
        registrationOpen: false,
        today: '2026-07-01',
        registrationStartDate: '2026-08-01',
        registrationEndDate: '2026-08-15',
        availableSeats: 0,
        branchEligible: false,
      }),
    ).toEqual([
      'PROGRAM_UNAVAILABLE',
      'REGISTRATION_NOT_OPEN',
      'REGISTRATION_NOT_STARTED',
      'NO_AVAILABLE_SEATS',
      'BRANCH_NOT_ELIGIBLE',
    ]);
  });
});
