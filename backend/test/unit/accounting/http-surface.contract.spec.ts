import { describe, expect, it } from '@jest/globals';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { REQUIRED_PERMISSIONS_KEY } from '../../../src/core/decorators/require-permissions.decorator';
import { ExpenseController } from '../../../src/modules/accounting/controllers/expenses.controller';
import { PERMISSION_CATALOG } from '../../../prisma/seeds/permission-catalog';
import { API_PREFIX } from '../../../src/shared/constants';

const METHOD_NAME: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
};

interface Route {
  signature: string;
  handler: string;
  permissions: string[] | undefined;
}

/** Reads what Nest would register, without booting the app or a database. */
function collectRoutes(): Route[] {
  const base = Reflect.getMetadata(PATH_METADATA, ExpenseController) ?? '';
  const proto = ExpenseController.prototype as unknown as Record<string, unknown>;
  const routes: Route[] = [];

  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key === 'constructor') continue;
    const handler = proto[key];
    if (typeof handler !== 'function') continue;
    const path = Reflect.getMetadata(PATH_METADATA, handler);
    const method = Reflect.getMetadata(METHOD_METADATA, handler);
    if (path === undefined || method === undefined) continue;
    const full = `/${API_PREFIX}/${base}/${path}`
      .replace(/\/+/g, '/')
      .replace(/\/$/, '');
    routes.push({
      signature: `${METHOD_NAME[method as number]} ${full}`,
      handler: key,
      permissions: Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, handler),
    });
  }
  return routes;
}

/**
 * The canonical surface from `contracts/expenses-api.md`, expressed as the
 * public URL. `API_PREFIX` is applied globally in `main.ts`, so the controller
 * itself must not repeat it — asserting the full path here is what catches a
 * doubled `/api/v1/api/v1` prefix.
 */
const CANONICAL = [
  'POST /api/v1/expenses',
  'GET /api/v1/expenses',
  'GET /api/v1/expenses/:id',
  'PATCH /api/v1/expenses/:id',
  'POST /api/v1/expenses/:id/submit',
  'POST /api/v1/expenses/:id/review',
  'POST /api/v1/expenses/:id/approve',
  'POST /api/v1/expenses/:id/reject',
  'POST /api/v1/expenses/:id/return',
  'POST /api/v1/expenses/:id/pay',
  'POST /api/v1/expenses/:id/archive',
  'POST /api/v1/expenses/:id/attachments',
  'DELETE /api/v1/expenses/:id/attachments/:attachmentId',
  // Review, pay and the comment thread complete the lifecycle the permission
  // catalogue already named: `requests.review`, `requests.markPaid` and
  // `comments.add` were grantable keys with no route behind them.
  'GET /api/v1/expenses/:id/comments',
  'POST /api/v1/expenses/:id/comments',
].sort();

describe('Expense Management HTTP surface', () => {
  const routes = collectRoutes();

  it('exposes exactly the canonical operations', () => {
    expect(routes.map((r) => r.signature).sort()).toEqual(CANONICAL);
  });

  it('guards every route with a permission key', () => {
    const unguarded = routes
      .filter((r) => !r.permissions?.length)
      .map((r) => r.signature);
    expect(unguarded).toEqual([]);
  });

  it('uses only permission keys that exist in the seeded catalogue', () => {
    const known = new Set(PERMISSION_CATALOG.map((p) => p.key));
    const unknown = routes
      .flatMap((r) => r.permissions ?? [])
      .filter((key) => !known.has(key));
    // A key absent from the catalogue can never be granted, which would make
    // the endpoint permanently unreachable rather than merely restricted.
    expect([...new Set(unknown)]).toEqual([]);
  });

  describe('prohibited surface', () => {
    it('never deletes an expense — archival is the only removal', () => {
      const deletes = routes
        .filter((r) => r.signature.startsWith('DELETE '))
        .map((r) => r.signature);
      expect(deletes).toEqual([
        'DELETE /api/v1/expenses/:id/attachments/:attachmentId',
      ]);
    });

    it('exposes no route that rewrites approval history', () => {
      expect(routes.filter((r) => /history/i.test(r.signature))).toEqual([]);
    });

    it('offers no PUT anywhere', () => {
      expect(routes.filter((r) => r.signature.startsWith('PUT '))).toEqual([]);
    });
  });

  it('requires the decide permission for all three decisions', () => {
    for (const handler of ['approve', 'reject', 'returnExpense']) {
      const route = routes.find((r) => r.handler === handler);
      expect(route?.permissions).toContain('accounting.requests.decide');
    }
  });
});
