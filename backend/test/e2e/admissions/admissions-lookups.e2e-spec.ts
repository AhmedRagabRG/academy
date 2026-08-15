import 'reflect-metadata';
import { AdmissionController } from '../../../src/modules/admissions/admissions/admission.controller';
import { AdmissionsLookupsService } from '../../../src/modules/admissions/lookups/admissions-lookups.service';

describe('Admissions consolidated lookup contract', () => {
  it('preserves disabled reasons and requests only bounded dependent batches', async () => {
    const selectableForProgram = jest.fn().mockResolvedValue({
      items: [
        {
          id: 'batch-id',
          programId: 'program-id',
          name: 'Batch',
          code: 'B-1',
          status: 'REGISTRATION_OPEN',
          version: 2,
          availableSeats: 4,
          financialRevisionId: 'financial-id',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    });
    const masterOption = {
      id: 'branch-id',
      label: 'Branch',
      active: false,
      disabledReason: 'inactive',
    };
    const service = new AdmissionsLookupsService(
      {
        selectable: jest.fn().mockResolvedValue([
          {
            id: 'program-id',
            code: 'PRG',
            name: 'Program',
            productType: 'PROFESSIONAL_PROGRAM',
            status: 'ACTIVE',
            batchable: true,
          },
          {
            id: 'course-id',
            code: 'CRS',
            name: 'Course',
            productType: 'TRAINING_COURSE',
            status: 'ACTIVE',
            batchable: false,
          },
        ]),
        pricing: jest.fn().mockResolvedValue({
          basePrice: { amount: '100', currency: 'EGP', precision: 2 },
          registrationFees: { amount: '10', currency: 'EGP', precision: 2 },
        }),
      } as never,
      { selectableForProgram } as never,
      {
        selectable: jest.fn().mockResolvedValue([masterOption]),
        selectableValues: jest.fn().mockResolvedValue([masterOption]),
      } as never,
      { selectable: jest.fn().mockResolvedValue([masterOption]) } as never,
      {
        get: jest.fn().mockResolvedValue({ organizationId: 'organization-id' }),
      } as never,
    );
    const result = await service.get();
    expect(result.branches[0]).toMatchObject({
      value: 'branch-id',
      status: 'inactive',
      disabledReason: 'inactive',
    });
    expect(result.offerings).toHaveLength(2);
    expect(result.batches).toHaveLength(1);
    expect(selectableForProgram).toHaveBeenCalledTimes(1);
    expect(selectableForProgram).toHaveBeenCalledWith(
      'program-id',
      undefined,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      1,
      100,
    );
  });

  it('protects the single lookup endpoint with admissions.view', () => {
    const prototype = AdmissionController.prototype as unknown as Record<
      string,
      unknown
    >;
    const handler = prototype.lookups;
    if (typeof handler !== 'function') throw new Error('Missing handler');
    expect(Reflect.getMetadata('requiredPermissions', handler)).toEqual([
      'admissions.view',
    ]);
  });
});
