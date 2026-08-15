import { BadRequestException } from '@nestjs/common';
export const normalizeCatalogCode = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
export const normalizeCatalogSearch = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
export function moneyToMinor(amount: string, precision: number): bigint {
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(amount) || precision < 0 || precision > 6)
    throw new BadRequestException('Invalid money value');
  const [whole, fraction = ''] = amount.split('.');
  if (fraction.length > precision)
    throw new BadRequestException('Money precision exceeded');
  return BigInt(`${whole}${fraction.padEnd(precision, '0')}`);
}
export function minorToMoney(
  amount: bigint,
  currency: string,
  precision: number,
) {
  const raw = amount.toString().padStart(precision + 1, '0');
  return {
    amount: precision
      ? `${raw.slice(0, -precision)}.${raw.slice(-precision)}`
      : raw,
    currency,
    precision,
  };
}
export function assertContiguous(positions: number[]) {
  if (positions.some((position, index) => position !== index + 1))
    throw new BadRequestException('Positions must be contiguous from 1');
}
export function assertHttpsUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new BadRequestException('Invalid URL');
  }
  if (url.protocol !== 'https:')
    throw new BadRequestException('Only HTTPS URLs are accepted');
}
