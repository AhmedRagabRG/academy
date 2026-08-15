import 'reflect-metadata';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { AdmissionController } from '../../../src/modules/admissions/admissions/admission.controller';
import { ApplicantController } from '../../../src/modules/admissions/applicants/applicant.controller';
import { AdmissionDocumentController } from '../../../src/modules/admissions/documents/admission-document.controller';

describe('Admissions route contract', () => {
  it.each([
    [AdmissionController, 'list', '/', 0],
    [AdmissionController, 'export', 'export', 0],
    [AdmissionController, 'lookups', 'lookups', 0],
    [AdmissionController, 'duplicates', 'duplicates', 1],
    [AdmissionController, 'bulkStatus', 'bulk-status', 1],
    [AdmissionController, 'create', '/', 1],
    [AdmissionController, 'get', ':id', 0],
    [AdmissionController, 'update', ':id', 4],
    [AdmissionController, 'status', ':id/status', 4],
    [AdmissionController, 'selection', ':id/selection', 4],
    [AdmissionController, 'financials', ':id/financials', 4],
    [AdmissionController, 'readiness', ':id/readiness', 0],
    [AdmissionController, 'lifecycle', ':id/lifecycle', 0],
    [AdmissionController, 'financialHistory', ':id/financial-history', 0],
    [AdmissionController, 'enrollmentReadiness', ':id/enrollment-readiness', 0],
    [ApplicantController, 'archive', ':applicantId/archive', 4],
    [AdmissionDocumentController, 'list', '/', 0],
    [AdmissionDocumentController, 'upload', '/', 1],
    [AdmissionDocumentController, 'replace', ':documentId/replace', 1],
    [AdmissionDocumentController, 'withdraw', ':documentId/withdraw', 1],
    [AdmissionDocumentController, 'verify', ':documentId/verify', 1],
    [AdmissionDocumentController, 'versions', ':documentId/versions', 0],
    [AdmissionDocumentController, 'refreshPolicy', 'refresh-policy', 1],
  ] as const)(
    '%p.%s exposes canonical path, method, permission, and Swagger response',
    (controller, method, path, verb) => {
      const prototype = controller.prototype as unknown as Record<
        string,
        unknown
      >;
      const handler = prototype[method];
      expect(typeof handler).toBe('function');
      if (typeof handler !== 'function') throw new Error('Missing handler');
      expect(Reflect.getMetadata(PATH_METADATA, handler) ?? '').toBe(path);
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(verb);
      expect(Reflect.getMetadata('requiredPermissions', handler)).toBeDefined();
      expect(Reflect.getMetadata('swagger/apiResponse', handler)).toBeDefined();
    },
  );

  it('does not expose permanent delete or a dedicated cancellation action', () => {
    const prototype = AdmissionController.prototype as unknown as Record<
      string,
      unknown
    >;
    expect(prototype.delete).toBeUndefined();
    expect(prototype.cancel).toBeUndefined();
  });
});
