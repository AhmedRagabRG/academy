import { ConfigService } from '@nestjs/config';
import { ValidationException } from '../../../src/core/exceptions';
import { PasswordPolicyService } from '../../../src/modules/identity/auth/password-policy.service';

describe('PasswordPolicyService', () => {
  const config = new ConfigService({ passwordPolicy: { minLength: 12 } });
  const policy = new PasswordPolicyService(config);

  it('accepts a password meeting every configured requirement', () => {
    expect(() => policy.validate('StrongPass1!')).not.toThrow();
  });

  it.each([
    'Short1!',
    'NOLOWERCASE1!',
    'nouppercase1!',
    'NoNumberHere!',
    'NoSymbolHere1',
  ])('rejects a password that violates the policy: %s', (password) => {
    expect(() => policy.validate(password)).toThrow(ValidationException);
  });
});
