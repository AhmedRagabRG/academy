import {
  normalizeArabic,
  normalizeDigits,
} from '../../src/shared/utils/arabic-normalize';
describe('Arabic normalization', () => {
  it('folds alef variants, ya, ta marbuta, and diacritics', () =>
    expect(normalizeArabic('آأإٱ ى ة مُحَمَّد')).toBe('اااا ي ه محمد'));
  it('folds Arabic-Indic digits', () =>
    expect(normalizeDigits('١٢٣۴۵۶')).toBe('123456'));
});
