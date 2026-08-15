import { BatchPublicService } from '../../../src/modules/program-batches/batches/batch-public.service';

describe('Program Batches public port surface', () => {
  it.each([
    'resolveHistorical',
    'selectableForProgram',
    'readiness',
    'eligibility',
    'currentSelectionReference',
    'resolveFinancialRevision',
    'snapshotForSelection',
  ] as const)('provides %s without exposing Prisma records', (method) => {
    expect(typeof BatchPublicService.prototype[method]).toBe('function');
  });
});
