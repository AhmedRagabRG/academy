import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProductTypeDto } from '../../../src/modules/catalog/taxonomy/dto/product-type.dto';
import { BATCHABLE } from '../../../src/modules/catalog/types/catalog.types';
describe('taxonomy closed contract', () => {
  it('keeps batchability fixed and validates field kinds/versions', async () => {
    expect(BATCHABLE).toEqual({
      PROFESSIONAL_PROGRAM: true,
      PROFESSIONAL_DIPLOMA: false,
      TRAINING_COURSE: false,
    });
    const dto = plainToInstance(UpdateProductTypeDto, {
      expectedVersion: 0,
      fields: [
        { key: 'x', label: 'x', kind: 'TEXT', required: true, position: 1 },
      ],
    });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });
});
