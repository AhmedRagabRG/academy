import { AdmissionSelectionPolicy } from '../../../src/modules/admissions/admissions/admission-selection.policy';
import type {
  AdmissionOfferingReference,
  AdmissionBatchReference,
} from '../../../src/modules/admissions/types/admissions-reference.port';

describe('AdmissionSelectionPolicy', () => {
  const policy = new AdmissionSelectionPolicy();
  const money = { amount: '100.00', currency: 'EGP', precision: 2 };
  const offering: AdmissionOfferingReference = {
    id: 'p',
    code: 'P',
    label: 'Program',
    active: true,
    kind: 'professional-program',
    version: 1,
    registrationBranchIds: ['r'],
    studyBranchIds: ['s'],
    price: {
      sourceId: 'p',
      sourceVersion: 1,
      productPrice: money,
      registrationFees: money,
    },
    documentPolicyId: 'd',
    documentPolicyVersion: 1,
  };
  const batch: AdmissionBatchReference = {
    id: 'b',
    code: 'B',
    label: 'Batch',
    active: true,
    programId: 'p',
    version: 1,
    registrationBranchIds: ['r'],
    studyBranchIds: ['s'],
    registrationOpen: true,
    availableSeats: 1,
    academicYearId: 'y',
    price: offering.price,
  };

  it('accepts an open matching program batch and eligible branches', () =>
    expect(
      policy.assess({
        offering,
        batch,
        registrationBranchId: 'r',
        studyBranchId: 's',
      }),
    ).toEqual({ eligible: true, reasons: [] }));
  it('aggregates all distinct eligibility failures', () =>
    expect(
      policy.assess({
        offering: { ...offering, active: false },
        batch: {
          ...batch,
          programId: 'other',
          active: false,
          registrationOpen: false,
          availableSeats: 0,
        },
        registrationBranchId: 'x',
        studyBranchId: 'x',
      }).reasons,
    ).toEqual(
      expect.arrayContaining([
        'offering-inactive',
        'batch-program-mismatch',
        'batch-inactive',
        'batch-registration-closed',
        'batch-full',
        'batch-registration-branch-ineligible',
        'batch-study-branch-ineligible',
      ]),
    ));
  it('forbids batches for non-program offerings', () =>
    expect(
      policy.assess({
        offering: { ...offering, kind: 'training-course' },
        batch,
        registrationBranchId: 'r',
        studyBranchId: 's',
      }).reasons,
    ).toContain('batch-forbidden'));
});
