import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateEmployeeDto,
  ResetPasswordDto,
  UpdateEmployeeDto,
} from '../../../src/modules/identity/employees/dto/employee-mutations.dto';
import { ListEmployeesDto } from '../../../src/modules/identity/employees/dto/list-employees.dto';

describe('employee DTO contracts', () => {
  const uuid = '11111111-1111-4111-8111-111111111111';

  it('accepts normalized multi-role employee input', async () => {
    const dto = plainToInstance(CreateEmployeeDto, {
      displayName: 'أحمد محمود',
      email: 'admin@example.com',
      phone: '+201000000001',
      roleIds: [uuid],
      password: 'StrongPass1!',
      status: 'active',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.status).toBe('ACTIVE');
  });

  it('rejects invalid phone, assignments, sort, and password confirmation', async () => {
    const employee = plainToInstance(CreateEmployeeDto, {
      displayName: 'x',
      email: 'bad',
      phone: '12',
      roleIds: [],
      password: '',
      status: 'bad',
    });
    expect((await validate(employee)).length).toBeGreaterThan(0);
    expect(
      (
        await validate(
          plainToInstance(ListEmployeesDto, { sort: 'passwordHash' }),
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(
      (
        await validate(
          plainToInstance(ResetPasswordDto, {
            newPassword: 'StrongPass1!',
            confirmPassword: 'different',
            expectedVersion: 1,
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });

  it('rejects server-owned update fields under the global whitelist policy', async () => {
    const dto = plainToInstance(UpdateEmployeeDto, {
      status: 'ARCHIVED',
      passwordHash: 'secret',
      expectedVersion: 1,
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.map(({ property }) => property).sort()).toEqual([
      'passwordHash',
      'status',
    ]);
  });
});
