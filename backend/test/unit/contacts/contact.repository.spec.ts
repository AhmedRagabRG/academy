import {
  ContactRepository,
  normalizeName,
  normalizePhone,
} from '../../../src/modules/contacts/contact.repository';
import { ContactListDto } from '../../../src/modules/contacts/dto/contact.dto';

describe('contact normalization', () => {
  it('reduces phone numbers to comparable digits, Arabic numerals included', () => {
    expect(normalizePhone('+20 10 5555 1100')).toBe('201055551100');
    expect(normalizePhone('٠١٠٥٥٥٥١١٠٠')).toBe('01055551100');
  });

  it('folds Arabic orthographic variants so search matches either spelling', () => {
    expect(normalizeName(' أحمد ')).toBe(normalizeName('احمد'));
    expect(normalizeName('فاطمة')).toBe(normalizeName('فاطمه'));
  });
});

describe('ContactRepository cursor', () => {
  const repository = new ContactRepository({} as never);

  it('round-trips a query-bound cursor', () => {
    const query = new ContactListDto();
    const fingerprint = repository.fingerprint(query);
    const encoded = repository.encode({
      v: 1,
      fingerprint,
      id: 'row',
      snapshotAt: '2026-09-01T00:00:00.000Z',
      lastActivityAt: '2026-08-31T00:00:00.000Z',
      normalizedName: 'ahmed',
      createdAt: '2026-08-01T00:00:00.000Z',
    });
    expect(repository.decode(encoded, fingerprint)?.id).toBe('row');
  });

  it('rejects a cursor issued for a different query', () => {
    const query = new ContactListDto();
    const encoded = repository.encode({
      v: 1,
      fingerprint: repository.fingerprint(query),
      id: 'row',
      snapshotAt: '2026-09-01T00:00:00.000Z',
      lastActivityAt: '2026-08-31T00:00:00.000Z',
      normalizedName: 'ahmed',
      createdAt: '2026-08-01T00:00:00.000Z',
    });
    const other = new ContactListDto();
    other.search = 'مريم';
    expect(() =>
      repository.decode(encoded, repository.fingerprint(other)),
    ).toThrow(/مؤشر الصفحة لا يخص/);
  });

  it('rejects a malformed cursor', () => {
    expect(() => repository.decode('not-a-cursor', 'fp')).toThrow(
      /مؤشر الصفحة غير صالح/,
    );
  });

  it('keeps sorting and keyset paging consistent per sort mode', () => {
    expect(repository.orderBy('name')).toEqual([
      { normalizedName: 'asc' },
      { id: 'asc' },
    ]);
    const cursor = {
      v: 1 as const,
      fingerprint: 'fp',
      id: 'row',
      snapshotAt: '2026-09-01T00:00:00.000Z',
      lastActivityAt: '2026-08-31T00:00:00.000Z',
      normalizedName: 'ahmed',
      createdAt: '2026-08-01T00:00:00.000Z',
    };
    expect(repository.cursorWhere('name', cursor)).toEqual({
      OR: [
        { normalizedName: { gt: 'ahmed' } },
        { normalizedName: 'ahmed', id: { gt: 'row' } },
      ],
    });
    expect(repository.cursorWhere('recent', undefined)).toEqual({});
  });
});
