import 'reflect-metadata';
import { doubleCsrf } from 'csrf-csrf';
import { AdmissionController } from '../../../src/modules/admissions/admissions/admission.controller';
import { AdmissionPolicy } from '../../../src/modules/admissions/admissions/admission.policy';
import { AdmissionService } from '../../../src/modules/admissions/admissions/admission.service';
import { ApplicantController } from '../../../src/modules/admissions/applicants/applicant.controller';
import { AdmissionDocumentController } from '../../../src/modules/admissions/documents/admission-document.controller';
import {
  filterAdmissionDetailSections,
  mapAdmissionListItem,
} from '../../../src/modules/admissions/mappers/admission.mapper';

const CLOSED_PERMISSIONS = new Set([
  'admissions.view',
  'admissions.create',
  'admissions.update',
  'admissions.archive',
  'admissions.export',
  'admissions.assign',
  'admissions.academic.manage',
  'admissions.finance.view',
  'admissions.finance.manage',
  'admissions.documents.view',
  'admissions.documents.manage',
  'admissions.documents.verify',
  'admissions.submit',
  'admissions.review',
  'admissions.approve',
  'admissions.reject',
  'admissions.return',
  'admissions.enrollment-readiness',
]);

describe('Admissions security surface', () => {
  it.each([
    [AdmissionController, 'list'],
    [AdmissionController, 'export'],
    [AdmissionController, 'lookups'],
    [AdmissionController, 'duplicates'],
    [AdmissionController, 'bulkStatus'],
    [AdmissionController, 'create'],
    [AdmissionController, 'get'],
    [AdmissionController, 'update'],
    [AdmissionController, 'status'],
    [AdmissionController, 'selection'],
    [AdmissionController, 'financials'],
    [AdmissionController, 'readiness'],
    [AdmissionController, 'lifecycle'],
    [AdmissionController, 'financialHistory'],
    [AdmissionController, 'enrollmentReadiness'],
    [ApplicantController, 'archive'],
    [AdmissionDocumentController, 'list'],
    [AdmissionDocumentController, 'upload'],
    [AdmissionDocumentController, 'replace'],
    [AdmissionDocumentController, 'withdraw'],
    [AdmissionDocumentController, 'verify'],
    [AdmissionDocumentController, 'versions'],
    [AdmissionDocumentController, 'refreshPolicy'],
  ] as const)(
    '%p.%s uses only a closed admissions permission',
    (controller, method) => {
      const prototype = controller.prototype as unknown as Record<
        string,
        unknown
      >;
      const handler = prototype[method];
      if (typeof handler !== 'function') throw new Error('Missing handler');
      const required = Reflect.getMetadata('requiredPermissions', handler) as
        string[] | undefined;
      expect(required?.length).toBeGreaterThan(0);
      expect(
        required?.every((permission) => CLOSED_PERMISSIONS.has(permission)),
      ).toBe(true);
    },
  );

  it('masks list phones and redacts field-sensitive detail sections', () => {
    const list = mapAdmissionListItem({
      id: 'admission',
      reference: 'ADM-1',
      applicantId: 'applicant',
      applicantName: 'Applicant',
      primaryPhone: '+20 100 123 4567',
      status: 'draft',
      offeringId: 'offering',
      offeringCode: 'PRG',
      offeringLabel: 'Program',
      registrationBranchId: 'branch',
      registrationBranchLabel: 'Branch',
      studyBranchId: 'branch',
      studyBranchLabel: 'Branch',
      updatedAt: new Date().toISOString(),
      version: 1,
    });
    expect(list.primaryPhone).toBe('********4567');
    const detail = filterAdmissionDetailSections(
      {
        id: 'admission',
        financial: { amount: '100' },
        documents: [{ id: 'doc' }],
      },
      {
        viewFinancials: false,
        viewDocuments: false,
        update: false,
        assign: false,
        manageAcademic: false,
        manageFinancials: false,
        archive: false,
        availableActions: [],
      },
    );
    expect(detail).not.toHaveProperty('financial');
    expect(detail).not.toHaveProperty('documents');
  });

  it('covers every closed permission through a route, lifecycle action, or field-sensitive projection', () => {
    const exposed = new Set<string>(['admissions.assign']);
    for (const [controller, methods] of [
      [
        AdmissionController,
        [
          'list',
          'export',
          'lookups',
          'duplicates',
          'bulkStatus',
          'create',
          'get',
          'update',
          'status',
          'selection',
          'financials',
          'readiness',
          'lifecycle',
          'financialHistory',
          'enrollmentReadiness',
        ],
      ],
      [ApplicantController, ['archive']],
      [
        AdmissionDocumentController,
        [
          'list',
          'upload',
          'replace',
          'withdraw',
          'verify',
          'versions',
          'refreshPolicy',
        ],
      ],
    ] as const) {
      const prototype = controller.prototype as unknown as Record<
        string,
        unknown
      >;
      for (const method of methods) {
        const handler = prototype[method];
        if (typeof handler !== 'function') throw new Error('Missing handler');
        const required = Reflect.getMetadata('requiredPermissions', handler) as
          string[] | undefined;
        for (const permission of required ?? []) exposed.add(permission);
      }
    }
    const policy = new AdmissionPolicy();
    for (const [from, to] of [
      ['draft', 'submitted'],
      ['submitted', 'under-review'],
      ['under-review', 'approved'],
      ['under-review', 'rejected'],
      ['under-review', 'draft'],
      ['draft', 'archived'],
    ] as const) {
      const permission = policy.transition(from, to).permission;
      if (permission) exposed.add(permission);
    }
    expect(exposed).toEqual(CLOSED_PERMISSIONS);
  });

  it('refuses an explicit branch filter outside caller scope before querying persistence', async () => {
    const list = jest.fn();
    const service = new AdmissionService(
      { list } as never,
      {} as never,
      {} as never,
      {} as never,
      {
        get: jest.fn().mockResolvedValue({ organizationId: 'organization' }),
      } as never,
      // The configured document requirements; unused on the list path.
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.list(
        {
          accountId: 'actor',
          displayName: 'Scoped Employee',
          email: 'scoped@example.test',
          sessionId: 'session',
          roles: [],
          permissionKeys: ['admissions.view'],
          authorizedBranchIds: ['allowed-branch'],
          organizationWide: false,
          authenticatedAt: new Date().toISOString(),
        },
        { branchId: 'forbidden-branch' },
      ),
    ).rejects.toMatchObject({ code: 'OUT_OF_SCOPE', status: 403 });
    expect(list).not.toHaveBeenCalled();
  });

  it('refuses unverified mutations and forbids credentialed wildcard CORS', () => {
    const csrf = doubleCsrf({
      getSecret: () => 'admissions-test-secret-at-least-32-characters',
      getSessionIdentifier: () => 'session',
      ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    });
    expect(
      csrf.validateRequest({
        method: 'PATCH',
        cookies: {},
        headers: {},
      } as never),
    ).toBe(false);
    expect(process.env.CORS_ORIGINS).not.toContain('*');
  });
});
