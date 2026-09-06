import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PageAsset, WhatsappNumberAsset } from './meta-graph.client';

export interface LinkingSession {
  id: string;
  accountId: string;
  userAccessToken: string;
  pages: PageAsset[];
  whatsappNumbers: WhatsappNumberAsset[];
  expiresAt: number;
}

const TTL_MS = 10 * 60 * 1000;

/**
 * Short-lived server-side hold for the token obtained during a Meta linking
 * flow. Keeping it here means the operator's browser never has to carry a
 * provider token between the OAuth callback and the asset selection.
 */
@Injectable()
export class ChannelLinkingStore {
  private readonly sessions = new Map<string, LinkingSession>();

  create(
    accountId: string,
    userAccessToken: string,
    assets: { pages: PageAsset[]; whatsappNumbers: WhatsappNumberAsset[] },
  ): LinkingSession {
    this.prune();
    const session: LinkingSession = {
      id: randomUUID(),
      accountId,
      userAccessToken,
      pages: assets.pages,
      whatsappNumbers: assets.whatsappNumbers,
      expiresAt: Date.now() + TTL_MS,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string, accountId: string): LinkingSession | undefined {
    this.prune();
    const session = this.sessions.get(id);
    return session && session.accountId === accountId ? session : undefined;
  }

  consume(id: string): void {
    this.sessions.delete(id);
  }

  private prune(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions)
      if (session.expiresAt <= now) this.sessions.delete(id);
  }
}
