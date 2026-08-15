import {
  deriveAdmissionDocumentState,
  reconcileRequirementKeys,
  selectCurrentVersion,
  validateDocumentDecision,
  validateRequirementFile,
  type DocumentRequirementRule,
} from '../../../src/modules/admissions/documents/admission-document.policy';

describe('Admission document policy', () => {
  const requirement: DocumentRequirementRule = {
    id: 'requirement',
    stableKey: 'national-id',
    required: true,
    allowedMimeTypes: ['application/pdf', 'image/jpeg'],
    maximumBytes: 2_000_000,
  };

  it('applies the stricter requirement type and size limits', () => {
    expect(
      validateRequirementFile(requirement, {
        mimeType: 'image/png',
        size: 50,
      }),
    ).toBe('unsupported-type');
    expect(
      validateRequirementFile(requirement, {
        mimeType: 'application/pdf',
        size: 2_000_001,
      }),
    ).toBe('file-too-large');
    expect(
      validateRequirementFile(requirement, {
        mimeType: 'application/pdf',
        size: 2_000_000,
      }),
    ).toBeNull();
  });

  it('derives state from current evidence rather than client input', () => {
    const version = {
      id: 'version',
      status: 'available' as const,
      mimeType: 'application/pdf',
      byteSize: 100,
      versionNumber: 1,
    };
    expect(deriveAdmissionDocumentState({})).toBe('missing');
    expect(deriveAdmissionDocumentState({ uploading: true })).toBe('uploading');
    expect(deriveAdmissionDocumentState({ currentVersion: version })).toBe(
      'pending',
    );
    expect(
      deriveAdmissionDocumentState({
        currentVersion: version,
        latestDecision: {
          decision: 'verified',
          decidedAt: new Date('2026-01-01'),
        },
      }),
    ).toBe('verified');
    expect(
      deriveAdmissionDocumentState({
        currentVersion: version,
        latestDecision: {
          decision: 'rejected',
          reason: 'Unreadable',
          decidedAt: new Date('2026-01-01'),
        },
      }),
    ).toBe('rejected');
  });

  it('requires rejection reasons but not verification reasons', () => {
    expect(validateDocumentDecision('verified')).toBe(true);
    expect(validateDocumentDecision('rejected', '  ')).toBe(false);
    expect(validateDocumentDecision('rejected', 'Unreadable')).toBe(true);
  });

  it('selects the highest available version and ignores withdrawn evidence', () => {
    expect(
      selectCurrentVersion([
        {
          id: 'v1',
          status: 'available',
          mimeType: 'image/png',
          byteSize: 10,
          versionNumber: 1,
        },
        {
          id: 'v2',
          status: 'withdrawn',
          mimeType: 'image/png',
          byteSize: 10,
          versionNumber: 2,
        },
      ])?.id,
    ).toBe('v1');
  });

  it('reconciles requirements by stable key', () => {
    expect(
      reconcileRequirementKeys(
        ['national-id', 'old-declaration'],
        ['national-id', 'qualification'],
      ),
    ).toEqual({
      retainedKeys: ['national-id'],
      addedKeys: ['qualification'],
      retiredKeys: ['old-declaration'],
    });
  });
});
