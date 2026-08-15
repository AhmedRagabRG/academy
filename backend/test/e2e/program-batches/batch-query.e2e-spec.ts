import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListProgramBatchesDto } from '../../../src/modules/program-batches/batches/dto/list-batches.dto';

describe('Program Batch query contract', () => {
  it('accepts every documented filter together', async () => {
    const query = plainToInstance(ListProgramBatchesDto, {
      search: 'دفعة',
      academicYearId: crypto.randomUUID(),
      intakeId: crypto.randomUUID(),
      branchId: crypto.randomUUID(),
      status: 'registration-open',
      sortBy: 'code',
      sortOrder: 'asc',
      page: '1',
      pageSize: '100',
    });
    expect(await validate(query)).toEqual([]);
  });
});
