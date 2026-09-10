import { chunk } from '../../../../src/modules/ai/knowledge/ingestion/chunker';

describe('knowledge chunker', () => {
  it('carries a sentence overlap into the next chunk', () => {
    const chunks = chunk(
      'First sentence. Second sentence. Third sentence. Fourth sentence.',
      { targetTokens: 10, overlapRatio: 0.3 },
    );
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.content).toContain('Second sentence.');
    expect(chunks[1]?.content).toContain('Second sentence.');
  });

  it('never cuts a sentence that fits within the target', () => {
    const chunks = chunk(
      'A short first sentence. A short second sentence. A short third sentence.',
      { targetTokens: 9 },
    );
    expect(chunks).toHaveLength(3);
    expect(chunks.every((item) => item.content.endsWith('.'))).toBe(true);
  });

  it('carries the nearest heading onto every chunk', () => {
    const chunks = chunk(
      '# Admissions\n\nApplications close soon. Documents are required. Fees apply.',
      { targetTokens: 8 },
    );
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((item) => item.heading === 'Admissions')).toBe(true);
  });

  it('splits an oversized paragraph on sentence boundaries', () => {
    const chunks = chunk(
      'Sentence number one is here. Sentence number two is here. Sentence number three is here.',
      { targetTokens: 10, overlapRatio: 0 },
    );
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((item) => item.content).join(' ')).toContain(
      'Sentence number two is here.',
    );
  });

  it('returns no chunks for empty input', () => {
    expect(chunk('  \n\t ')).toEqual([]);
  });

  it('recognises Arabic question marks and commas as boundaries', () => {
    const chunks = chunk(
      'هل التسجيل مفتوح الآن؟ نعم بالتأكيد، تبدأ الدراسة الأسبوع القادم.',
      {
        targetTokens: 8,
        overlapRatio: 0,
      },
    );
    expect(chunks.map((item) => item.content)).toEqual([
      'هل التسجيل مفتوح الآن؟',
      'نعم بالتأكيد،',
      'تبدأ الدراسة الأسبوع القادم.',
    ]);
  });
});
