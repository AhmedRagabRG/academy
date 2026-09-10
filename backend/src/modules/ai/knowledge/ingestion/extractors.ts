import { DomainException } from '../../../../core/exceptions';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

const PDF_MIME = 'application/pdf';
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const TEXT_MIMES = new Set(['text/plain', 'text/markdown', 'text/x-markdown']);

const normalize = (text: string): string =>
  text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export async function extractText(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  let text: string;
  if (mimeType === PDF_MIME) {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      text = result.text.replace(/--\s*\d+\s+of\s+\d+\s*--/g, '');
    } finally {
      await parser.destroy();
    }
  } else if (mimeType === DOCX_MIME) {
    text = (await mammoth.extractRawText({ buffer })).value;
  } else if (TEXT_MIMES.has(mimeType)) {
    text = buffer.toString('utf8');
  } else {
    throw new DomainException(
      'unsupported-knowledge-source-type',
      'نوع ملف مصدر المعرفة غير مدعوم',
      422,
    );
  }
  return normalize(text);
}
