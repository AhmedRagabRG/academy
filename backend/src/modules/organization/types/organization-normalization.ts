import { normalizeArabic } from '../../../shared/utils/arabic-normalize';
import type { FileDescriptor } from '../../../shared/types/file-descriptor';

export const normalizeOrganizationCode = (value: string): string =>
  value.trim().toUpperCase();

export const normalizeOrganizationEmail = (value: string): string =>
  value.trim().toLowerCase();

export const normalizeOrganizationSearch = (value: string): string =>
  normalizeArabic(value).trim().toLowerCase();

export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

export function isSafeFileDescriptor(value: unknown): value is FileDescriptor {
  if (typeof value !== 'object' || value === null) return false;
  const file = value as Record<string, unknown>;
  return (
    typeof file.id === 'string' &&
    typeof file.fileName === 'string' &&
    typeof file.originalName === 'string' &&
    typeof file.mimeType === 'string' &&
    typeof file.size === 'number' &&
    file.size >= 0 &&
    typeof file.url === 'string' &&
    !file.url.startsWith('file:') &&
    !file.url.includes('..')
  );
}
