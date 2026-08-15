import { PasswordService } from '../../src/core/auth/password.service';
describe('PasswordService', () => {
  const service = new PasswordService();
  it('hashes with argon2id and verifies only the correct password', async () => {
    const hash = await service.hash('secret-value');
    expect(hash).toContain('$argon2id$');
    expect(hash).not.toContain('secret-value');
    await expect(service.verify('secret-value', hash)).resolves.toBe(true);
    await expect(service.verify('wrong', hash)).resolves.toBe(false);
  });
});
