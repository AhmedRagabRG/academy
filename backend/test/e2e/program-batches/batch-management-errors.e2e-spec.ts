import {
  BatchCodeLockedException,
  BatchCapacityExceededException,
  ProgramNotBatchableException,
} from '../../../src/core/exceptions';

describe('Program Batch closed errors', () => {
  it.each([
    [new BatchCodeLockedException(), 'CODE_LOCKED', 409],
    [new BatchCapacityExceededException(), 'CAPACITY_EXCEEDED', 409],
    [new ProgramNotBatchableException(), 'PROGRAM_NOT_BATCHABLE', 422],
  ] as const)('maps %s', (error, code, status) => {
    expect(error.code).toBe(code);
    expect(error.status).toBe(status);
  });
});
