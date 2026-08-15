import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migration = readFileSync(
  join(
    process.cwd(),
    'prisma/migrations/20260803120000_admissions/migration.sql',
  ),
  'utf8',
);

describe('Admissions migration', () => {
  it.each([
    'Applicant',
    'Admission',
    'AdmissionSelectionRevision',
    'AdmissionEligibilityAssessment',
    'AdmissionFinancialRevision',
    'AdmissionDocumentPolicySnapshot',
    'AdmissionDocumentPolicyRequirement',
    'AdmissionDocument',
    'AdmissionDocumentVersion',
    'AdmissionDocumentDecision',
    'AdmissionApprovalSnapshot',
    'AdmissionLifecycleEvent',
    'AdmissionTimelineEvent',
    'AdmissionRequestKey',
    'AdmissionReferenceCounter',
  ])('creates %s', (table) => {
    expect(migration).toContain(`CREATE TABLE "${table}"`);
  });

  it('enforces aggregate ownership and immutable histories', () => {
    expect(migration).toContain('Admission_current_pointer_ownership');
    expect(migration).toContain('AdmissionDocument_current_pointer_ownership');
    expect(migration).toContain('DEFERRABLE INITIALLY DEFERRED');
    expect(migration).toContain('AdmissionSelectionRevision_append_only');
    expect(migration).toContain('AdmissionTimelineEvent_append_only');
    expect(migration).toContain('admissions_reject_history_mutation');
  });

  it('enforces lifecycle, money, file, eligibility, and idempotency constraints', () => {
    expect(migration).toContain('Admission_archive_complete');
    expect(migration).toContain('AdmissionFinancialRevision_amounts');
    expect(migration).toContain('AdmissionDocumentVersion_file');
    expect(migration).toContain('AdmissionSelectionRevision_batch_by_kind');
    expect(migration).toContain(
      'AdmissionRequestKey_organizationId_operationScope_idempoten_key',
    );
  });
});
