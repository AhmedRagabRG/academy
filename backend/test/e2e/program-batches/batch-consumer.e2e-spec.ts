import { PATH_METADATA } from '@nestjs/common/constants';
import { BatchConsumerController } from '../../../src/modules/program-batches/batches/batch-consumer.controller';

describe('Program Batch consumer contract', () => {
  it('uses the canonical batch-centric route', () => {
    expect(Reflect.getMetadata(PATH_METADATA, BatchConsumerController)).toBe(
      'batches',
    );
  });
});
