import { AdmissionPolicy } from '../../../src/modules/admissions/admissions/admission.policy';

describe('AdmissionPolicy', () => {
  const policy = new AdmissionPolicy();

  it.each([
    ['draft', 'submitted', 'submit'],
    ['submitted', 'under-review', 'start-review'],
    ['under-review', 'approved', 'approve'],
    ['under-review', 'rejected', 'reject'],
    ['under-review', 'draft', 'return'],
    ['approved', 'enrolled', 'enroll'],
  ] as const)('allows %s -> %s as %s', (from, to, action) => {
    expect(policy.transition(from, to)).toMatchObject({
      allowed: true,
      action,
    });
  });

  it.each([
    'draft',
    'submitted',
    'under-review',
    'approved',
    'rejected',
  ] as const)(
    'maps cancellation from %s to reason-required archival',
    (status) => {
      expect(policy.transition(status, 'archived')).toMatchObject({
        allowed: true,
        action: 'archive',
        permission: 'admissions.archive',
        reasonRequired: true,
      });
    },
  );

  it('keeps enrolled and archived terminal', () => {
    expect(policy.transition('enrolled', 'archived').allowed).toBe(false);
    expect(policy.transition('archived', 'draft').allowed).toBe(false);
  });

  it('requires the active reviewer for review decisions', () => {
    expect(policy.canActAsReviewer('reviewer-a', 'reviewer-a')).toBe(true);
    expect(policy.canActAsReviewer('reviewer-a', 'reviewer-b')).toBe(false);
  });

  it('projects only permitted actions and respects reviewer ownership', () => {
    expect(
      policy.availableActions(
        'under-review',
        ['admissions.approve', 'admissions.reject', 'admissions.archive'],
        'reviewer-a',
        'reviewer-b',
      ),
    ).toEqual(['archive']);
  });
});
