import type { Request, Response } from 'express';
import {
  AccountInactiveException,
  InvalidCredentialsException,
} from '../../../src/core/exceptions';
import { IdentityAuthService } from '../../../src/modules/identity/auth/auth.service';

const account = (status = 'ACTIVE') => ({
  id: '11111111-1111-4111-8111-111111111111',
  email: 'employee@example.com',
  passwordHash: 'stored',
  displayName: 'أحمد محمود',
  phone: '+201000000001',
  position: null,
  departmentId: null,
  branchIds: ['22222222-2222-4222-8222-222222222222'],
  organizationWide: false,
  avatar: null,
  status,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  roles: [
    {
      role: {
        id: '33333333-3333-4333-8333-333333333333',
        code: 'staff',
        displayName: 'موظف',
        description: '',
        status: 'ACTIVE',
        version: 1,
        permissions: [{ permission: { key: 'dashboard.view', active: true } }],
      },
    },
  ],
});

describe('IdentityAuthService credential behavior', () => {
  const response = {} as Response;
  const request = {
    get: () => undefined,
    ip: '127.0.0.1',
  } as unknown as Request;
  const service = (
    record: ReturnType<typeof account> | null,
    valid: boolean,
  ) => {
    const events = { emit: jest.fn() };
    const cookies = {
      setCredentialCookies: jest.fn(),
      clearCredentialCookies: jest.fn(),
    };
    return {
      events,
      cookies,
      instance: new IdentityAuthService(
        { findByEmail: jest.fn().mockResolvedValue(record) } as never,
        {
          hash: jest.fn().mockResolvedValue('dummy'),
          verify: jest.fn().mockResolvedValue(valid),
        },
        {
          issueRefreshToken: jest
            .fn()
            .mockResolvedValue({ id: 'session', token: 'refresh' }),
          issueAccessToken: jest.fn().mockResolvedValue('access'),
        } as never,
        cookies as never,
        events as never,
      ),
    };
  };

  it('creates a session, sets cookies, returns a secret-free context, and emits login', async () => {
    const fixture = service(account(), true);
    const result = await fixture.instance.login(
      { email: 'employee@example.com', password: 'secret' },
      request,
      response,
    );
    expect(fixture.cookies.setCredentialCookies).toHaveBeenCalledWith(
      response,
      'access',
      'refresh',
    );
    expect(JSON.stringify(result)).not.toMatch(/password|token|hash/i);
    expect(fixture.events.emit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'identity.login' }),
    );
  });

  it.each([
    [null, false],
    [account(), false],
  ] as const)(
    'uses the same external failure for unknown and wrong credentials',
    async (record, valid) => {
      await expect(
        service(record, valid).instance.login(
          { email: 'employee@example.com', password: 'wrong' },
          request,
          response,
        ),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);
    },
  );

  it('refuses an inactive account after doing password verification', async () => {
    await expect(
      service(account('INACTIVE'), true).instance.login(
        { email: 'employee@example.com', password: 'secret' },
        request,
        response,
      ),
    ).rejects.toBeInstanceOf(AccountInactiveException);
  });
});
