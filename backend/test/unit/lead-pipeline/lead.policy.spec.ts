import { LeadPolicy } from '../../../src/modules/lead-pipeline/lead.policy';
import type { CallerContext } from '../../../src/shared/types/caller-context';

const caller = (
  permissionKeys: string[],
  overrides: Partial<CallerContext> = {},
): CallerContext => ({
  accountId: '00000000-0000-4000-8000-000000000001',
  displayName: 'Actor',
  email: 'a@example.com',
  sessionId: 'session',
  roles: [],
  permissionKeys,
  organizationWide: false,
  authenticatedAt: new Date(0).toISOString(),
  ...overrides,
});

describe('LeadPolicy', () => {
  const policy = new LeadPolicy();

  it('scopes leads for callers with pipeline.view', () => {
    expect(policy.scope(caller(['pipeline.view']))).toEqual({});
  });

  it('refuses a caller without pipeline.view', () => {
    expect(() => policy.scope(caller(['contacts.view']))).toThrow(/صلاحية/);
  });

  it('turns a missing record into a not-found rather than leaking existence', () => {
    expect(() => policy.assertVisible(null)).toThrow(/غير موجود/);
    expect(() => policy.assertVisible({ id: 'lead' })).not.toThrow();
  });
});
