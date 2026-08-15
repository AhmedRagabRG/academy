import {
  ADMISSIONS_EVENT_NAMES,
  admissionEvent,
} from '../../../src/modules/admissions/events/admissions.events';
import { safeTimelineMetadata } from '../../../src/modules/admissions/mappers/admission.mapper';

describe('Admissions structured disclosure boundary', () => {
  it('defines an audit-ready event for every material aggregate category', () => {
    expect(ADMISSIONS_EVENT_NAMES).toEqual(
      expect.arrayContaining([
        'admissions.created',
        'admissions.applicant-updated',
        'admissions.assignment-changed',
        'admissions.selection-changed',
        'admissions.financial-updated',
        'admissions.document-changed',
        'admissions.status-changed',
        'admissions.archived',
        'admissions.enrolled',
      ]),
    );
  });

  it('keeps structured events free of applicant, note, document, and monetary content', () => {
    const event = admissionEvent({
      name: 'admissions.status-changed',
      kind: 'status-changed',
      admissionId: 'admission-id',
      organizationId: 'organization-id',
      actorId: 'actor-id',
      version: 4,
      occurredAt: new Date().toISOString(),
      fromStatus: 'submitted',
      toStatus: 'under-review',
      changedSections: ['workflow'],
    });
    expect(JSON.stringify(event)).not.toMatch(
      /nationalId|phone|address|privateNotes|fileDescriptor|storage|amountMinor|reasonText/i,
    );
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.changedSections)).toBe(true);
  });

  it('allowlists timeline identifiers and descriptors while dropping sensitive values', () => {
    const metadata = safeTimelineMetadata({
      fromStatus: 'draft',
      toStatus: 'submitted',
      documentId: 'document-id',
      nationalId: '29901011234567',
      primaryPhone: '01000000000',
      privateNotes: 'sensitive note',
      requiredAmountMinor: '100000',
      storagePath: '/private/file.pdf',
    });
    expect(metadata).toEqual({
      fromStatus: 'draft',
      toStatus: 'submitted',
      documentId: 'document-id',
    });
  });
});
