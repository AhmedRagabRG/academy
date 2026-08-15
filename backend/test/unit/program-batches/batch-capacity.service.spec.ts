import { BatchCapacityService } from '../../../src/modules/program-batches/capacity/batch-capacity.service';

describe('BatchCapacityService', () => {
  it.each([
    [100, 0, 100, 'AVAILABLE'],
    [100, 89, 11, 'AVAILABLE'],
    [100, 90, 10, 'NEARLY_FULL'],
    [9, 8, 1, 'AVAILABLE'],
    [10, 9, 1, 'NEARLY_FULL'],
    [100, 100, 0, 'FULL'],
    [100, 101, 0, 'OVER_CAPACITY'],
  ] as const)('derives %i/%i as %s', (maximum, current, available, status) => {
    expect(BatchCapacityService.derive(maximum, current)).toEqual({
      maximumStudents: maximum,
      currentStudents: current,
      availableSeats: available,
      status,
    });
  });
});
