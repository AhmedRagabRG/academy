import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';
import { DomainException } from '../../../core/exceptions';

const PREFIX = 'v1';
const SALT = 'inbox-channel-token';

/**
 * Envelope encryption for provider access tokens. Tokens never reach the API
 * surface in plaintext: only this service and the delivery/webhook paths that
 * call the provider ever see the decrypted value.
 */
@Injectable()
export class ChannelCryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const secret = config.getOrThrow<string>('channelSecrets.encryptionKey');
    this.key = scryptSync(secret, SALT, 32);
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plain, 'utf8'),
      cipher.final(),
    ]);
    return [
      PREFIX,
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  decrypt(value: string): string {
    const [prefix, iv, tag, payload] = value.split('.');
    if (prefix !== PREFIX || !iv || !tag || !payload)
      throw new DomainException(
        'channel-token-unreadable',
        'تعذر قراءة بيانات اعتماد القناة',
        500,
      );
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.key,
        Buffer.from(iv, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(payload, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new DomainException(
        'channel-token-unreadable',
        'تعذر قراءة بيانات اعتماد القناة',
        500,
      );
    }
  }

  /** Last four characters, for showing the operator which token is stored. */
  hint(plain: string): string {
    return plain.length <= 4 ? '••••' : `••••${plain.slice(-4)}`;
  }
}
