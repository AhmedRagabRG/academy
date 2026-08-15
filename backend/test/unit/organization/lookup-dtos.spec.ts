import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateLookupValueDto,
  ReorderLookupValuesDto,
} from '../../../src/modules/organization/lookups/dto/lookup-value.dto';

describe('lookup DTOs', () => {
  it('rejects negative ordering', async () => {
    const dto = plainToInstance(CreateLookupValueDto, {
      name: 'قيمة',
      code: 'value',
      sortOrder: -1,
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
  it('validates reorder members and group version', async () => {
    const dto = plainToInstance(ReorderLookupValuesDto, {
      items: [],
      expectedGroupVersion: 0,
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
