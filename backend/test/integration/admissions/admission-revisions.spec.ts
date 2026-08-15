import { readFileSync } from 'node:fs';
import { AdmissionRepository } from '../../../src/modules/admissions/admissions/admission.repository';

describe('Admission immutable revisions', () => {
  it('inserts selection and financial history and switches pointers separately', async () => {
    const tx = {
      admissionSelectionRevision: {
        create: jest.fn().mockResolvedValue({ id: 's2' }),
      },
      admissionFinancialRevision: {
        create: jest.fn().mockResolvedValue({ id: 'f2' }),
      },
      admission: { update: jest.fn().mockResolvedValue({}) },
    };
    const repository = new AdmissionRepository({} as never);
    await repository.appendSelection(
      { admissionId: 'a', revisionNumber: 2 } as never,
      tx as never,
    );
    await repository.appendFinancial(
      { admissionId: 'a', revisionNumber: 2 } as never,
      tx as never,
    );
    await repository.setCurrentPointers(
      'a',
      { currentSelectionRevisionId: 's2', currentFinancialRevisionId: 'f2' },
      tx as never,
    );
    expect(tx.admissionSelectionRevision.create).toHaveBeenCalledTimes(1);
    expect(tx.admissionFinancialRevision.create).toHaveBeenCalledTimes(1);
    expect(tx.admission.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a' } }),
    );
  });

  it('has database uniqueness, ownership, and append-only denial for concurrent revisions', () => {
    const sql = readFileSync(
      'prisma/migrations/20260803120000_admissions/migration.sql',
      'utf8',
    );
    expect(sql).toContain(
      'AdmissionSelectionRevision_admissionId_revisionNumber_key',
    );
    expect(sql).toContain(
      'AdmissionFinancialRevision_admissionId_revisionNumber_key',
    );
    expect(sql).toContain('Admission_current_pointer_ownership');
    expect(sql).toContain('AdmissionSelectionRevision_append_only');
    expect(sql).toContain('AdmissionFinancialRevision_append_only');
  });
});
