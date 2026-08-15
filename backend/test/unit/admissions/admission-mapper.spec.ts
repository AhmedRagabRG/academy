import {
  filterAdmissionDetailSections,
  mapAdmissionListItem,
  safeTimelineMetadata,
} from '../../../src/modules/admissions/mappers/admission.mapper';

describe('Admission mapper privacy', () => {
  it('masks all phone digits except the final four in list projections', () => {
    const mapped = mapAdmissionListItem({
      id: 'a',
      reference: 'ADM',
      applicantId: 'p',
      applicantName: 'Name',
      primaryPhone: '+20 1012345678',
      offeringId: 'o',
      offeringCode: 'C',
      offeringLabel: 'Course',
      registrationBranchId: 'r',
      registrationBranchLabel: 'R',
      studyBranchId: 's',
      studyBranchLabel: 'S',
      status: 'draft',
      updatedAt: '2026-01-01',
      version: 1,
    });
    expect(mapped.primaryPhone.endsWith('5678')).toBe(true);
    expect(mapped.primaryPhone).not.toContain('101234');
  });
  it('redacts financial and document sections independently', () => {
    const detail = {
      id: 'a',
      financial: { amount: 'secret' },
      documents: ['secret'],
    };
    expect(
      filterAdmissionDetailSections(detail, {
        viewFinancials: false,
        manageFinancials: false,
        viewDocuments: true,
        update: false,
        assign: false,
        manageAcademic: false,
        archive: false,
        availableActions: [],
      }),
    ).toMatchObject({ id: 'a', documents: ['secret'] });
  });
  it('allows only safe timeline metadata keys and excludes PII/money/notes', () =>
    expect(
      safeTimelineMetadata({
        offeringId: 'p',
        nationalId: 'secret',
        notes: 'secret',
        requiredAmount: 100,
      }),
    ).toEqual({ offeringId: 'p' }));
});
