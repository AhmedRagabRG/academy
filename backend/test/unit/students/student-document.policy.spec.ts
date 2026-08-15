import 'reflect-metadata';
import { StudentDocumentPolicy } from '../../../src/modules/students/documents/student-document.policy';

describe('StudentDocumentPolicy', () => {
  const policy = new StudentDocumentPolicy();

  it('publishes exactly the seven documented types', () => {
    expect(policy.types().map((type) => type.key)).toEqual([
      'personal-photo',
      'national-id',
      'parent-national-id',
      'birth-certificate',
      'qualification-certificate',
      'admission-declaration',
      'additional-attachment',
    ]);
  });

  it('enforces the documented limits it publishes', () => {
    expect(policy.find('personal-photo')?.maxBytes).toBe(2 * 1024 * 1024);
    expect(policy.find('national-id')?.maxBytes).toBe(5 * 1024 * 1024);
    expect(policy.find('additional-attachment')?.maxBytes).toBe(
      10 * 1024 * 1024,
    );
    expect(policy.find('admission-declaration')?.allowedMimeTypes).toEqual([
      'application/pdf',
    ]);
  });

  it('marks only additional-attachment as multiple', () => {
    const multiple = policy
      .types()
      .filter((type) => type.multiple)
      .map((type) => type.key);
    expect(multiple).toEqual(['additional-attachment']);
  });

  it('distinguishes the three file failures', () => {
    const type = policy.find('national-id')!;

    // Zero bytes is unreadable — deliberately not a type or size error.
    expect(() =>
      policy.assertFileAcceptable(type, {
        mimetype: 'application/pdf',
        size: 0,
      }),
    ).toThrow(expect.objectContaining({ code: 'file-unreadable' }));

    expect(() =>
      policy.assertFileAcceptable(type, { mimetype: 'text/plain', size: 100 }),
    ).toThrow(expect.objectContaining({ code: 'unsupported-file-type' }));

    expect(() =>
      policy.assertFileAcceptable(type, {
        mimetype: 'application/pdf',
        size: 6 * 1024 * 1024,
      }),
    ).toThrow(expect.objectContaining({ code: 'file-too-large' }));

    expect(() =>
      policy.assertFileAcceptable(type, {
        mimetype: 'application/pdf',
        size: 1000,
      }),
    ).not.toThrow();
  });

  it('accepts a file exactly at the size limit', () => {
    const type = policy.find('national-id')!;
    expect(() =>
      policy.assertFileAcceptable(type, {
        mimetype: 'application/pdf',
        size: type.maxBytes,
      }),
    ).not.toThrow();
  });

  it('orders required types before optional ones', () => {
    const sorted = [
      'additional-attachment',
      'national-id',
      'parent-national-id',
      'birth-certificate',
    ].sort((a, b) => policy.compare(a, b));

    const requiredCount = sorted.filter(
      (key) => policy.find(key)?.required,
    ).length;
    // Every required key must appear before any optional one.
    sorted.slice(0, requiredCount).forEach((key) => {
      expect(policy.find(key)?.required).toBe(true);
    });
  });

  it('counts completion from required types only, ignoring archived', () => {
    const completion = policy.completion([
      { typeKey: 'personal-photo', state: 'PRESENT' },
      { typeKey: 'national-id', state: 'PRESENT' },
      { typeKey: 'birth-certificate', state: 'ARCHIVED' },
      { typeKey: 'parent-national-id', state: 'PRESENT' },
    ]);

    expect(completion.requiredTypes).toBe(5);
    expect(completion.present).toBe(3);
    expect(completion.archived).toBe(1);
    // birth-certificate is required but archived, so it still counts missing.
    expect(completion.missing).toBe(3);
  });

  it('reports every required type missing for a student with no documents', () => {
    const completion = policy.completion([]);
    expect(completion.missing).toBe(completion.requiredTypes);
    expect(completion.present).toBe(0);
  });

  it('maps admission requirement keys and skips unknown ones', () => {
    expect(policy.mapAdmissionRequirementKey('national-id')).toBe(
      'national-id',
    );
    expect(policy.mapAdmissionRequirementKey('declaration')).toBe(
      'admission-declaration',
    );
    expect(policy.mapAdmissionRequirementKey('not-a-student-type')).toBeNull();
  });
});
