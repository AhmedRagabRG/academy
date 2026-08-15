import { normalizeArabic } from '../../../shared/utils/arabic-normalize';

export const normalizeBatchCode = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const normalizeBatchSearch = (value: string): string =>
  normalizeArabic(value.trim()).toLowerCase();
