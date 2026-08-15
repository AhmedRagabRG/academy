import 'reflect-metadata';
import { validate } from 'class-validator';
import { AdmissionController } from '../../../src/modules/admissions/admissions/admission.controller';
import { ChangeAdmissionStatusDto } from '../../../src/modules/admissions/admissions/dto/admission-lifecycle.dto';
import { AdmissionLifecycleService } from '../../../src/modules/admissions/admissions/admission-lifecycle.service';
import { AdmissionPolicy } from '../../../src/modules/admissions/admissions/admission.policy';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const caller: CallerContext = {
  accountId: 'actor-id',
  displayName: 'Reviewer',
  email: 'reviewer@example.test',
  sessionId: 'session-id',
  roles: [],
  permissionKeys: ['admissions.archive'],
  authorizedBranchIds: [],
  organizationWide: true,
  authenticatedAt: new Date().toISOString(),
};

describe('Admissions lifecycle HTTP contract', () => {
  it.each([
    ['status', 'admissions.view'],
    ['bulkStatus', 'admissions.view'],
    ['readiness', 'admissions.view'],
    ['lifecycle', 'admissions.view'],
  ] as const)(
    '%s is protected and delegates action authorization',
    (method, permission) => {
      const prototype = AdmissionController.prototype as unknown as Record<
        string,
        unknown
      >;
      const handler = prototype[method];
      if (typeof handler !== 'function') throw new Error('Missing handler');
      expect(Reflect.getMetadata('requiredPermissions', handler)).toContain(
        permission,
      );
    },
  );

  it.each([
    ['rejected', undefined],
    ['draft', '  '],
    ['archived', undefined],
  ] as const)(
    'rejects %s without a material reason',
    async (toStatus, reason) => {
      const dto = Object.assign(new ChangeAdmissionStatusDto(), {
        toStatus,
        reason,
        expectedVersion: 1,
      });
      expect(await validate(dto)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ property: 'reason' }),
        ]),
      );
    },
  );

  it('returns ordered partial-success bulk results without converting failures to HTTP errors', async () => {
    const transitionBulk = jest.fn().mockResolvedValue([
      { admissionId: 'first', success: true },
      { admissionId: 'second', success: false, error: { code: 'NOT_READY' } },
    ]);
    const controller = controllerWith({ transitionBulk });
    await expect(
      controller.bulkStatus(caller, {
        items: [
          { admissionId: 'first', toStatus: 'submitted', expectedVersion: 1 },
          { admissionId: 'second', toStatus: 'submitted', expectedVersion: 1 },
        ],
      }),
    ).resolves.toEqual([
      { admissionId: 'first', success: true },
      { admissionId: 'second', success: false, error: { code: 'NOT_READY' } },
    ]);
  });

  it('enforces action-specific permission inside the lifecycle boundary', async () => {
    const aggregate = { id: 'admission', status: 'DRAFT', version: 1 };
    const service = new AdmissionLifecycleService(
      { findAggregate: jest.fn().mockResolvedValue(aggregate) } as never,
      new AdmissionPolicy(),
      {} as never,
      {} as never,
    );
    await expect(
      service.transition({
        admissionId: 'admission',
        organizationId: 'organization',
        toStatus: 'submitted',
        expectedVersion: 1,
        caller,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });
});

function controllerWith(lifecycle: { transitionBulk: jest.Mock }) {
  return new AdmissionController(
    {} as never,
    lifecycle as never,
    {} as never,
    {} as never,
    {} as never,
    {
      get: jest.fn().mockResolvedValue({ organizationId: 'organization' }),
    } as never,
    {} as never,
  );
}
