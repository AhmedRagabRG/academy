import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ProductListDto,
  ProductStatusDto,
} from '../../../src/modules/catalog/products/dto/product.dto';
describe('catalog product DTO contract', () => {
  it('parses array filters and rejects an invalid lifecycle value', async () => {
    const q = plainToInstance(ProductListDto, {
      typeIds:
        '20000000-0000-4000-8000-000000000001,20000000-0000-4000-8000-000000000002',
      sort: 'price',
    });
    expect(await validate(q)).toHaveLength(0);
    expect(q.typeIds).toHaveLength(2);
    expect(
      await validate(
        plainToInstance(ProductStatusDto, {
          toStatus: 'UNKNOWN',
          expectedVersion: 1,
        }),
      ),
    ).not.toHaveLength(0);
  });
});
