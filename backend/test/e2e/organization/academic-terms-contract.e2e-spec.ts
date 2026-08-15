/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { AcademicTermController } from '../../../src/modules/organization/academic-calendar/academic-term.controller';
describe('academic term contract', () => {
  it.each([
    ['list', '/', 0],
    ['get', ':id', 0],
    ['create', '/', 1],
    ['update', ':id', 4],
    ['status', ':id/status', 4],
  ] as const)('%s', (m, p, v) => {
    const h = AcademicTermController.prototype[m];
    expect(Reflect.getMetadata(PATH_METADATA, h) ?? '').toBe(p);
    expect(Reflect.getMetadata(METHOD_METADATA, h)).toBe(v);
    expect(Reflect.getMetadata('swagger/apiResponse', h)).toBeDefined();
  });
});
