import { ValidationPipe } from '@nestjs/common';
import { ListAdmissionsDto } from '../../../src/modules/admissions/admissions/dto/list-admissions.dto';

describe('ListAdmissionsDto', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  it('coerces pagination and trims search while accepting the stable sort allowlist', async () => {
    const value = (await pipe.transform(
      {
        page: '2',
        pageSize: '100',
        search: '  ADM-1  ',
        status: 'under-review',
        sortBy: 'reference',
        sortOrder: 'asc',
      },
      { type: 'query', metatype: ListAdmissionsDto },
    )) as unknown as ListAdmissionsDto;
    expect(value).toMatchObject({
      page: 2,
      pageSize: 100,
      search: 'ADM-1',
      status: 'under-review',
      sortBy: 'reference',
      sortOrder: 'asc',
    });
  });
  it.each([
    { page: '0' },
    { pageSize: '0' },
    { status: 'cancelled' },
    { sortBy: 'nationalId' },
    { branchId: 'bad' },
    { unknown: 'field' },
  ])('rejects unsafe query %p', async (query) => {
    await expect(
      pipe.transform(query, { type: 'query', metatype: ListAdmissionsDto }),
    ).rejects.toBeDefined();
  });
});
