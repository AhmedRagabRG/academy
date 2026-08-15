import { AdmissionRepository } from '../../../src/modules/admissions/admissions/admission.repository';

describe('Admission creation persistence', () => {
  it('allocates organization/year references atomically through one upsert statement', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ value: 42 }]);
    const repository = new AdmissionRepository({} as never);
    await expect(
      repository.allocateReference(
        '10000000-0000-4000-8000-000000000001',
        2026,
        { $queryRaw: queryRaw } as never,
      ),
    ).resolves.toBe('ADM-2026-00042');
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('uses the durable organization/scope/key identity and detects an existing request', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ requestFingerprint: 'same', targetId: 'admission' });
    const repository = new AdmissionRepository({
      admissionRequestKey: { findUnique },
    } as never);
    await expect(
      repository.findRequestKey('org', 'admission:create', 'retry'),
    ).resolves.toMatchObject({ targetId: 'admission' });
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        organizationId_operationScope_idempotencyKey: {
          organizationId: 'org',
          operationScope: 'admission:create',
          idempotencyKey: 'retry',
        },
      },
    });
  });

  it('keeps the complete aggregate transaction serializable', async () => {
    const work = jest.fn().mockResolvedValue('done');
    const transaction = jest.fn(
      async (callback: (tx: object) => Promise<string>, options: object) => {
        expect(options).toEqual({ isolationLevel: 'Serializable' });
        return callback({});
      },
    );
    const repository = new AdmissionRepository({
      $transaction: transaction,
    } as never);
    await expect(repository.transaction(work)).resolves.toBe('done');
    expect(work).toHaveBeenCalledTimes(1);
  });
});
