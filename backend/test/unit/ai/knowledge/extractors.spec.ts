const getText = jest.fn();
const destroy = jest.fn(() => Promise.resolve());

jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn(() => ({ getText, destroy })),
}));

import { DomainException } from '../../../../src/core/exceptions';
import { extractText } from '../../../../src/modules/ai/knowledge/ingestion/extractors';

describe('knowledge extractors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getText.mockResolvedValue({ text: '', total: 1 });
  });

  it('strips pdf-parse v2 page markers', async () => {
    getText.mockResolvedValue({
      text: 'Academy text\n-- 1 of 1 --\n',
      total: 1,
    });
    await expect(
      extractText(Buffer.from('pdf'), 'application/pdf'),
    ).resolves.toBe('Academy text');
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('throws a domain exception for unsupported MIME types', async () => {
    await expect(
      extractText(Buffer.from('data'), 'image/png'),
    ).rejects.toBeInstanceOf(DomainException);
  });

  it('normalises CRLF, trailing spaces and excessive blank lines', async () => {
    await expect(
      extractText(Buffer.from('one  \r\n\r\n\r\n\r\ntwo\r\n'), 'text/plain'),
    ).resolves.toBe('one\n\ntwo');
  });
});
