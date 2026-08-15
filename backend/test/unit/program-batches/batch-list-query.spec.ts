import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListProgramBatchesDto } from '../../../src/modules/program-batches/batches/dto/list-batches.dto';

describe('ListProgramBatchesDto', () => {
  it('coerces status and page numbers', async () => {
    const value = plainToInstance(ListProgramBatchesDto, {
      status: 'registration-open',
      page: '2',
      pageSize: '20',
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });
    expect(await validate(value)).toEqual([]);
    expect(value.status).toBe('REGISTRATION_OPEN');
    expect(value.page).toBe(2);
  });
});
