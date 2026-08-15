import {
  CurrentSessionException,
  NotFoundException,
} from '../../../src/core/exceptions';
import { SessionService } from '../../../src/modules/identity/sessions/session.service';

describe('session revocation ownership', () => {
  it('refuses the current session before performing a lookup', async () => {
    const repository = { findValid: jest.fn(), revoke: jest.fn() };
    const service = new SessionService(repository as never);
    await expect(
      service.revoke('account', 'current', 'current'),
    ).rejects.toBeInstanceOf(CurrentSessionException);
    expect(repository.findValid).not.toHaveBeenCalled();
  });

  it.each(['unknown', 'foreign', 'expired', 'revoked'])(
    'uses the same non-disclosing result for %s sessions',
    async () => {
      const repository = {
        findValid: jest.fn().mockResolvedValue(null),
        revoke: jest.fn(),
      };
      const service = new SessionService(repository as never);
      await expect(
        service.revoke('account', 'current', 'target'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.revoke).not.toHaveBeenCalled();
    },
  );
});
