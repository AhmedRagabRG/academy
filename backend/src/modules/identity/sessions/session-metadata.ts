import type { Request } from 'express';
import type { SessionMetadata } from '../../../core/auth/refresh-token.repository';

const bounded = (value: string | undefined, fallback: string, max = 255) =>
  (value?.trim() || fallback).slice(0, max);

export function deriveSessionMetadata(request: Request): SessionMetadata {
  const userAgent = bounded(request.get('user-agent'), 'Unknown', 512);
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Firefox\//.test(userAgent)
      ? 'Firefox'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : 'Unknown browser';
  const device = /Mobile|Android|iPhone|iPad/i.test(userAgent)
    ? 'Mobile device'
    : 'Desktop device';
  return {
    device,
    browser,
    ipAddress: bounded(request.ip, 'unknown', 64),
    userAgent,
  };
}
