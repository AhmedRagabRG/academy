import { Injectable, Logger } from '@nestjs/common';
export interface DomainEvent {
  name: string;
  occurredAt: string;
  actor: { accountId: string } | null;
  target: { type: string; id: string };
  operation: string;
  payload: Record<string, unknown>;
}
@Injectable()
export class DomainEventBus {
  private readonly logger = new Logger(DomainEventBus.name);
  emit(event: DomainEvent): void {
    this.logger.debug({ domainEvent: event });
  }
}
