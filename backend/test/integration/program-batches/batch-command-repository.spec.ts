import { BatchRepository } from '../../../src/modules/program-batches/batches/batch.repository';

describe('BatchRepository command surface', () => {
  it.each([
    'create',
    'updateRoot',
    'replaceBranches',
    'appendFinancial',
    'setCurrentFinancialRevision',
    'transition',
  ] as const)('exposes %s behind the repository boundary', (method) => {
    expect(typeof BatchRepository.prototype[method]).toBe('function');
  });
});
