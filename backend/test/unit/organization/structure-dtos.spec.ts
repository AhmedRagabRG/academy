import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBranchDto } from '../../../src/modules/organization/branches/dto/branch.dto';
import { DepartmentListDto } from '../../../src/modules/organization/departments/dto/department.dto';

describe('structure DTOs', () => {
  it('rejects invalid branch contacts', async () => {
    const dto = plainToInstance(CreateBranchDto, {
      name: 'x',
      code: 'x',
      address: 'x',
      phone: 'abc',
      email: 'bad',
      workingHours: 'x',
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
  it('rejects an unknown sort value', async () => {
    const dto = plainToInstance(DepartmentListDto, { sort: 'unsafe' });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
