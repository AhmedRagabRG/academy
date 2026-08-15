import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProgramBatchDto } from '../../../src/modules/program-batches/batches/dto/upsert-batch.dto';

describe('CreateProgramBatchDto', () => {
  it('normalizes empty optional dates and validates nested structures', async () => {
    const dto = plainToInstance(CreateProgramBatchDto, {
      name: { ar: 'دفعة الخريف' },
      code: 'fall-1',
      academicYearId: crypto.randomUUID(),
      intakeId: crypto.randomUUID(),
      description: '',
      maximumStudents: 25,
      schedule: { registrationStartDate: '' },
      financialProfile: {
        programPrice: { amount: '100.00', currency: 'EGP', precision: 2 },
        registrationFee: { amount: '10.00', currency: 'EGP', precision: 2 },
        installmentsEnabled: false,
        installmentPlans: [],
        offers: [],
      },
      branchAssignments: [
        { branchId: crypto.randomUUID(), role: 'registration' },
      ],
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto.schedule.registrationStartDate).toBeUndefined();
  });
});
