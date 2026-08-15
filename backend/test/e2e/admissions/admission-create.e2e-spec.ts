import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { AdmissionController } from '../../../src/modules/admissions/admissions/admission.controller';
import { CreateAdmissionDto } from '../../../src/modules/admissions/admissions/dto/create-admission.dto';

describe('Admission create HTTP contract', () => {
  it.each([
    ['duplicates', 'duplicates'],
    ['create', '/'],
  ] as const)(
    'exposes POST /admissions/%s with admissions.create',
    (method, path) => {
      const handler = Object.getOwnPropertyDescriptor(
        AdmissionController.prototype,
        method,
      )?.value as (...args: unknown[]) => unknown;
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(1);
      expect(Reflect.getMetadata('requiredPermissions', handler)).toContain(
        'admissions.create',
      );
      expect(Reflect.getMetadata('swagger/apiResponse', handler)).toBeDefined();
    },
  );

  it('rejects forbidden server-owned fields under the global whitelist contract', async () => {
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    await expect(
      pipe.transform(
        { status: 'approved', reference: 'ADM-OWNED' },
        { type: 'body', metatype: CreateAdmissionDto },
      ),
    ).rejects.toBeDefined();
  });

  it('delegates the caller and validated command without wrapping tokens or server fields', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'a', status: 'draft' });
    const controller = new AdmissionController(
      { create } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const caller = { accountId: 'actor' } as never;
    const dto = { input: {} } as never;
    await expect(controller.create(caller, dto)).resolves.toEqual({
      id: 'a',
      status: 'draft',
    });
    expect(create).toHaveBeenCalledWith(caller, dto);
  });
});
