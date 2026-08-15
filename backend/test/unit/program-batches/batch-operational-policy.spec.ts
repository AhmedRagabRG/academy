import { BatchPolicy } from '../../../src/modules/program-batches/batches/batch.policy';
import {
  BatchCapacityExceededException,
  ValidationException,
} from '../../../src/core/exceptions';
import type { CreateProgramBatchDto } from '../../../src/modules/program-batches/batches/dto/upsert-batch.dto';

const valid = (): CreateProgramBatchDto => ({
  name: { ar: 'دفعة اختبار' },
  code: 'TEST-1',
  academicYearId: crypto.randomUUID(),
  intakeId: crypto.randomUUID(),
  description: '',
  maximumStudents: 20,
  schedule: {
    registrationStartDate: '2026-01-01',
    registrationEndDate: '2026-02-01',
    studyStartDate: '2026-02-01',
    studyEndDate: '2026-06-01',
    graduationDate: '2026-06-01',
  },
  financialProfile: {
    programPrice: { amount: '1000.00', currency: 'EGP', precision: 2 },
    registrationFee: { amount: '100.00', currency: 'EGP', precision: 2 },
    installmentsEnabled: false,
    installmentPlans: [],
    offers: [],
  },
  branchAssignments: [{ branchId: crypto.randomUUID(), role: 'registration' }],
});

describe('BatchPolicy operational rules', () => {
  const policy = new BatchPolicy();

  it('accepts chronological dates and a registration branch', () => {
    expect(() => policy.validateInput(valid())).not.toThrow();
  });

  it('rejects reversed dates', () => {
    const dto = valid();
    dto.schedule.registrationEndDate = '2025-12-31';
    expect(() => policy.validateInput(dto)).toThrow(ValidationException);
  });

  it('rejects duplicate branch roles', () => {
    const dto = valid();
    dto.branchAssignments.push(dto.branchAssignments[0]);
    expect(() => policy.validateInput(dto)).toThrow(ValidationException);
  });

  it('rejects capacity below current students', () => {
    expect(() => policy.assertCapacity(9, 10)).toThrow(
      BatchCapacityExceededException,
    );
  });
});
