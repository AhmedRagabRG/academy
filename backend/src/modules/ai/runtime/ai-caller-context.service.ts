import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../database/prisma.service';
import type { CallerContext } from '../../../shared/types/caller-context';

/**
 * The AI acts as a real, restricted account — never a fabricated caller. This
 * builds the CallerContext the same way AuthGuard would from a token claim:
 * the account's own roles and their permission keys, read from the database.
 * The account holds only tickets.create / contacts.view / contacts.update /
 * contacts.notes.manage / inbox.reply, so every domain-service validation,
 * policy and audit trail applies unchanged, and nothing here can widen what
 * the account is allowed to do.
 */
@Injectable()
export class AiCallerContextService {
  private readonly logger = new Logger(AiCallerContextService.name);

  constructor(private readonly db: PrismaService) {}

  async forAccount(accountId: string): Promise<CallerContext> {
    const account = await this.db.account.findFirstOrThrow({
      where: { id: accountId, status: 'ACTIVE' },
      select: {
        id: true,
        displayName: true,
        email: true,
        organizationWide: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                code: true,
                displayName: true,
                permissions: {
                  select: { permission: { select: { key: true } } },
                },
              },
            },
          },
        },
      },
    });

    const roles = account.roles.map((accountRole) => accountRole.role);
    const permissionKeys = [
      ...new Set(
        roles.flatMap((role) => role.permissions.map((p) => p.permission.key)),
      ),
    ];
    if (!permissionKeys.length)
      this.logger.warn(`AI account ${accountId} resolves to no permissions`);

    return {
      accountId: account.id,
      displayName: account.displayName,
      email: account.email,
      sessionId: randomUUID(),
      // The AI acts across the whole organization: it answers whichever
      // conversation arrives, so confining it to a branch would silently drop
      // work rather than route it.
      branchIds: [],
      roles: roles.map(({ id, code, displayName: name }) => ({
        id,
        code,
        displayName: name,
      })),
      permissionKeys,
      organizationWide: account.organizationWide,
      authenticatedAt: new Date().toISOString(),
    };
  }
}
