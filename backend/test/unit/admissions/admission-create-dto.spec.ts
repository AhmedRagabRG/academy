import { ValidationPipe } from '@nestjs/common';
import { DuplicateResolutionDto } from '../../../src/modules/admissions/admissions/dto/duplicate-resolution.dto';
import { CreateAdmissionDto } from '../../../src/modules/admissions/admissions/dto/create-admission.dto';

describe('Admission create DTOs', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const uuid = '10000000-0000-4000-8000-000000000001';
  const valid = {
    input: {
      applicant: {
        fullName: 'Valid Applicant',
        primaryPhone: '01012345678',
        nationalId: '29801011234567',
        address: 'Cairo address',
        dateOfBirth: '1998-01-01',
        qualificationId: uuid,
        graduationYear: 2020,
      },
      assignment: {
        registrationBranchId: uuid,
        studyBranchId: uuid,
        admissionsEmployeeId: uuid,
        customerServiceEmployeeId: uuid,
        customerServiceManagerId: uuid,
        departmentId: uuid,
        leadSourceId: uuid,
      },
      selection: { offeringKind: 'training-course', offeringId: uuid },
      financial: { discountMode: 'none', discountValue: '0' },
    },
    idempotencyKey: 'retry-key',
  };

  it('accepts a complete nested draft and strips no required assignment', async () => {
    const result = (await pipe.transform(valid, {
      type: 'body',
      metatype: CreateAdmissionDto,
    })) as unknown as CreateAdmissionDto;
    expect(result.input.assignment.customerServiceManagerId).toBe(uuid);
  });

  it('rejects server-owned fields and incomplete nested assignments', async () => {
    await expect(
      pipe.transform(
        { ...valid, status: 'approved' },
        { type: 'body', metatype: CreateAdmissionDto },
      ),
    ).rejects.toBeDefined();
    const invalid: typeof valid = structuredClone(valid);
    delete (
      invalid.input.assignment as Partial<typeof invalid.input.assignment>
    ).departmentId;
    await expect(
      pipe.transform(invalid, { type: 'body', metatype: CreateAdmissionDto }),
    ).rejects.toBeDefined();
  });

  it.each([
    [{ outcome: 'use-existing' }, false],
    [{ outcome: 'use-existing', applicantId: uuid }, true],
    [{ outcome: 'create-exception', reason: 'Known sibling' }, true],
    [{ outcome: 'create-exception' }, false],
  ])(
    'enforces duplicate resolution conditional fields',
    async (value, accepted) => {
      const result = pipe.transform(value, {
        type: 'body',
        metatype: DuplicateResolutionDto,
      });
      if (accepted) await expect(result).resolves.toBeDefined();
      else await expect(result).rejects.toBeDefined();
    },
  );
});
