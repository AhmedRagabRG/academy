import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { AdmissionController } from '../../../src/modules/admissions/admissions/admission.controller';
import {
  ChangeAdmissionSelectionDto,
  UpdateAdmissionFinancialsDto,
} from '../../../src/modules/admissions/admissions/dto/admission-revision.dto';

describe('Admission revision HTTP contract', () => {
  it.each([
    ['selection', 'admissions.academic.manage'],
    ['financials', 'admissions.finance.manage'],
    ['financialHistory', 'admissions.finance.view'],
  ] as const)('%s uses %s', (method, permission) =>
    expect(
      Reflect.getMetadata(
        'requiredPermissions',
        Object.getOwnPropertyDescriptor(AdmissionController.prototype, method)
          ?.value as (...args: unknown[]) => unknown,
      ),
    ).toContain(permission),
  );

  it('requires expectedVersion, reason, and explicit consequence confirmation for selection changes', async () => {
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    const selection = {
      selection: {
        offeringKind: 'training-course',
        offeringId: '10000000-0000-4000-8000-000000000001',
      },
      confirmedConsequences: ['financial-recalculated'],
      reason: 'Change target',
      expectedVersion: 2,
    };
    await expect(
      pipe.transform(selection, {
        type: 'body',
        metatype: ChangeAdmissionSelectionDto,
      }),
    ).resolves.toBeDefined();
    await expect(
      pipe.transform(
        { ...selection, confirmedConsequences: ['invented'] },
        { type: 'body', metatype: ChangeAdmissionSelectionDto },
      ),
    ).rejects.toBeDefined();
  });

  it('requires an exact financial command and positive optimistic version', async () => {
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    await expect(
      pipe.transform(
        {
          input: { discountMode: 'amount', discountValue: '10.00' },
          expectedVersion: 1,
        },
        { type: 'body', metatype: UpdateAdmissionFinancialsDto },
      ),
    ).resolves.toBeDefined();
    await expect(
      pipe.transform(
        {
          input: { discountMode: 'amount', discountValue: '10.00' },
          expectedVersion: 0,
        },
        { type: 'body', metatype: UpdateAdmissionFinancialsDto },
      ),
    ).rejects.toBeDefined();
  });
});
