import 'reflect-metadata';
import { AdmissionExportService } from '../../../src/modules/admissions/admissions/admission-export.service';
import { AdmissionController } from '../../../src/modules/admissions/admissions/admission.controller';
import { ApplicantController } from '../../../src/modules/admissions/applicants/applicant.controller';

describe('Admission management HTTP contract', () => {
  it.each([
    [AdmissionController, 'list', 'admissions.view'],
    [AdmissionController, 'get', 'admissions.view'],
    [AdmissionController, 'update', 'admissions.update'],
    [AdmissionController, 'export', 'admissions.export'],
    [ApplicantController, 'archive', 'admissions.archive'],
  ] as const)(
    '%p.%s uses exact permission %s',
    (controller, method, permission) => {
      const handler = (
        controller.prototype as unknown as Record<
          string,
          (...args: unknown[]) => unknown
        >
      )[method];
      expect(Reflect.getMetadata('requiredPermissions', handler)).toContain(
        permission,
      );
    },
  );

  it('streams a BOM CSV in bounded pages with only the redacted projection allowlist', async () => {
    const list = jest
      .fn()
      .mockResolvedValueOnce({
        items: [
          {
            reference: 'ADM-1',
            applicantName: 'Name',
            phoneHint: '*******5678',
            offeringLabel: 'Course',
            status: 'draft',
            nationalId: 'SECRET',
          },
        ],
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        items: [
          {
            reference: 'ADM-2',
            applicantName: 'Other',
            phoneHint: '*******1234',
            offeringLabel: 'Course',
            status: 'draft',
          },
        ],
        totalPages: 2,
      });
    const service = new AdmissionExportService({ list } as never);
    const chunks: string[] = [];
    for await (const chunk of service.streamCsv({} as never, {}))
      chunks.push(chunk);
    const csv = chunks.join('');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('ADM-1');
    expect(csv).not.toContain('SECRET');
    expect(list).toHaveBeenNthCalledWith(
      2,
      {},
      expect.objectContaining({ page: 2, pageSize: 100 }),
    );
  });

  it('streams 10,000 records in bounded pages without retaining an aggregate row array', async () => {
    const row = {
      reference: 'ADM-LOAD',
      applicantName: 'Load Test',
      phoneHint: '*******5678',
      offeringLabel: 'Course',
      status: 'draft',
    };
    const list = jest
      .fn()
      .mockImplementation((_caller, query: { page: number }) =>
        Promise.resolve({
          items: Array.from({ length: 100 }, () => row),
          totalPages: 100,
          page: query.page,
        }),
      );
    const service = new AdmissionExportService({ list } as never);
    let lines = 0;
    let chunks = 0;
    for await (const chunk of service.streamCsv({} as never, {})) {
      chunks += 1;
      lines += chunk.split('\r\n').length - 1;
    }
    expect(lines).toBe(10_001);
    expect(chunks).toBe(10_001);
    expect(list).toHaveBeenCalledTimes(100);
  });
});
