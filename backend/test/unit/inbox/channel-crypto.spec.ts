import { ConfigService } from '@nestjs/config';
import { ChannelCryptoService } from '../../../src/modules/inbox/channels/channel-crypto.service';

describe('ChannelCryptoService', () => {
  const crypto = new ChannelCryptoService(
    new ConfigService({
      channelSecrets: { encryptionKey: 'unit-test-key-at-least-32-characters' },
    }),
  );

  it('round-trips a provider token', () => {
    const token = 'EAAG-long-lived-page-token';
    const sealed = crypto.encrypt(token);
    expect(sealed).not.toContain(token);
    expect(crypto.decrypt(sealed)).toBe(token);
  });

  it('never produces the same ciphertext twice', () => {
    expect(crypto.encrypt('same')).not.toBe(crypto.encrypt('same'));
  });

  it('rejects tampered ciphertext instead of returning garbage', () => {
    const sealed = crypto.encrypt('token');
    const [prefix, iv, tag, payload] = sealed.split('.');
    const flipped = Buffer.from(payload, 'base64url');
    flipped[0] ^= 0xff;
    expect(() =>
      crypto.decrypt(
        [prefix, iv, tag, flipped.toString('base64url')].join('.'),
      ),
    ).toThrow(/تعذر قراءة/);
  });

  it('rejects a value that is not an envelope', () => {
    expect(() => crypto.decrypt('plain-token')).toThrow(/تعذر قراءة/);
  });

  it('cannot be read with a different key', () => {
    const other = new ChannelCryptoService(
      new ConfigService({
        channelSecrets: {
          encryptionKey: 'another-key-at-least-32-characters!',
        },
      }),
    );
    expect(() => other.decrypt(crypto.encrypt('token'))).toThrow();
  });
});
