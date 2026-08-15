import 'reflect-metadata';
import { AdmissionController } from '../../../src/modules/admissions/admissions/admission.controller';
import type { CallerContext } from '../../../src/shared/types/caller-context';

describe('Admission enrollment-readiness HTTP contract', () => {
  const caller = { accountId: 'actor-id' } as CallerContext;

  it('requires the dedicated enrollment-readiness permission', () => {
    const prototype = AdmissionController.prototype as unknown as Record<
      string,
      unknown
    >;
    const handler = prototype.enrollmentReadiness;
    if (typeof handler !== 'function') throw new Error('Missing handler');
    expect(Reflect.getMetadata('requiredPermissions', handler)).toEqual([
      'admissions.enrollment-readiness',
    ]);
  });

  it('performs scoped admission access before returning the redacted handoff', async () => {
    const get = jest.fn().mockResolvedValue({ id: 'admission-id' });
    const handoff = {
      ready: true,
      handoff: {
        admissionId: 'admission-id',
        approvalSnapshotId: 'approval-id',
        applicant: { applicantId: 'applicant-id', fullName: 'Applicant' },
        requiredAmountMinor: '10000',
      },
    };
    const getEnrollmentReadiness = jest.fn().mockResolvedValue(handoff);
    const controller = new AdmissionController(
      { get } as never,
      {} as never,
      {} as never,
      { getEnrollmentReadiness } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const result = await controller.enrollmentReadiness(caller, 'admission-id');
    expect(get).toHaveBeenCalledWith(caller, 'admission-id');
    expect(getEnrollmentReadiness).toHaveBeenCalledWith('admission-id');
    expect(JSON.stringify(result)).not.toMatch(
      /nationalId|primaryPhone|guardianPhone|privateNotes|address/,
    );
  });
});
