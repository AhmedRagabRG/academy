import {
  isNamed,
  parseComponents,
  parsePlaceholders,
  renderPreview,
} from '../../../src/modules/campaigns/templates/template-parsing';

describe('WhatsApp template parsing', () => {
  it('orders positional placeholders the way Meta expects', () => {
    expect(parsePlaceholders('مرحبًا {{2}}، موعدك {{1}} و{{2}}')).toEqual([
      '1',
      '2',
    ]);
  });

  it('keeps named placeholders in first-appearance order', () => {
    const tokens = parsePlaceholders('{{first_name}} — {{course_name}}');
    expect(tokens).toEqual(['first_name', 'course_name']);
    expect(isNamed(tokens)).toBe(true);
  });

  it('parses Meta components and renders a preview', () => {
    const parsed = parseComponents([
      { type: 'HEADER', format: 'TEXT', text: 'دعوة {{1}}' },
      { type: 'BODY', text: 'مرحبًا {{1}} في {{2}}' },
      { type: 'FOOTER', text: 'أكاديمية السلام' },
    ]);

    expect(parsed.headerText).toBe('دعوة {{1}}');
    expect(parsed.footerText).toBe('أكاديمية السلام');
    expect(
      renderPreview(parsed.bodyText, ['هدى', 'اليوم المفتوح'], ['1', '2']),
    ).toBe('مرحبًا هدى في اليوم المفتوح');
  });
});
