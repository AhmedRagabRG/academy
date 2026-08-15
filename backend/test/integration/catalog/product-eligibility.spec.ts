import { BATCHABLE } from '../../../src/modules/catalog/types/catalog.types';
describe('catalog eligibility capabilities', () => {
  it('keeps batch capability fixed by identity', () => {
    expect(BATCHABLE.PROFESSIONAL_PROGRAM).toBe(true);
    expect(BATCHABLE.PROFESSIONAL_DIPLOMA).toBe(false);
    expect(BATCHABLE.TRAINING_COURSE).toBe(false);
  });
});
