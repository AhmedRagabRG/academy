import { BatchCapacityService } from '../../../src/modules/program-batches/capacity/batch-capacity.service';

describe('Program Batch operational response contract', () => {
  it('never exposes negative available seats', () => {
    expect(BatchCapacityService.derive(10, 11)).toMatchObject({
      availableSeats: 0,
      status: 'OVER_CAPACITY',
    });
  });
});
