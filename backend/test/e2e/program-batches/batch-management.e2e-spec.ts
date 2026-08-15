import { PATH_METADATA } from '@nestjs/common/constants';
import { BatchController } from '../../../src/modules/program-batches/batches/batch.controller';

describe('Program Batch management contract', () => {
  it('uses the canonical nested parent route', () => {
    expect(Reflect.getMetadata(PATH_METADATA, BatchController)).toBe(
      'programs/:programId/batches',
    );
  });
});
