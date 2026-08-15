import { AdmissionRepository } from '../../../src/modules/admissions/admissions/admission.repository';

describe('Admission query/update persistence', () => {
  const admission = {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  const repository = new AdmissionRepository({ admission } as never);

  beforeEach(() => jest.clearAllMocks());

  it('builds Arabic-folded search, branch scope, filters, stable paging and ID tie-breaker', async () => {
    await repository.list(
      'org',
      {
        search: 'إختبار',
        branchId: '10000000-0000-4000-8000-000000000001',
        status: 'under-review',
        sortBy: 'applicantName',
        sortOrder: 'asc',
        page: 2,
        pageSize: 25,
      },
      ['10000000-0000-4000-8000-000000000001'],
    );
    const serializedCall = JSON.stringify(admission.findMany.mock.calls);
    expect(serializedCall).toContain('"skip":25');
    expect(serializedCall).toContain('"take":25');
    expect(serializedCall).toContain('"status":"UNDER_REVIEW"');
    expect(serializedCall).toContain('"AND":');
    expect(serializedCall).toContain('{"id":"asc"}');
  });

  it('uses optimistic compare-and-swap and increments exactly one version', async () => {
    const result = await repository.updateCompareAndSwap(
      'id',
      'org',
      3,
      { privateNotes: 'updated' },
      { admission } as never,
    );
    expect(result.count).toBe(1);
    expect(admission.updateMany).toHaveBeenCalledWith({
      where: { id: 'id', organizationId: 'org', version: 3 },
      data: { privateNotes: 'updated', version: { increment: 1 } },
    });
  });
});
