import { BatchPolicy } from '../../../src/modules/program-batches/batches/batch.policy';

describe('Program Batch lifecycle contract', () => {
  it('treats archived as terminal', () => {
    expect(() =>
      new BatchPolicy().assertTransition('ARCHIVED', 'DRAFT'),
    ).toThrow();
  });
});
