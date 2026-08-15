import type { Money } from '../types/money';
export function toMinorUnits(money: Money): bigint {
  const negative = money.amount.startsWith('-');
  const [whole = '0', fraction = ''] = money.amount.replace('-', '').split('.');
  const digits = `${whole}${fraction.padEnd(money.precision, '0').slice(0, money.precision)}`;
  const value = BigInt(digits || '0');
  return negative ? -value : value;
}
export function fromMinorUnits(
  units: bigint,
  currency: string,
  precision: number,
): Money {
  const negative = units < 0n;
  const digits = (negative ? -units : units)
    .toString()
    .padStart(precision + 1, '0');
  const amount = precision
    ? `${digits.slice(0, -precision)}.${digits.slice(-precision)}`
    : digits;
  return { amount: negative ? `-${amount}` : amount, currency, precision };
}
