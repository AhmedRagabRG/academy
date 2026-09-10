import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  INBOX_MESSAGE_RECEIVED_EVENT,
  type InboxMessageReceivedEvent,
} from '../../../core/events/inbox-message-received.event';
import { AiTurnEnqueueService } from './ai-turn-enqueue.service';

/**
 * The AI's entry point. Sits here rather than in the webhook so the inbox keeps
 * no knowledge of the AI, matching how CampaignDeliveryListener keeps the
 * webhook ignorant of campaigns.
 *
 * `suppressErrors: true` on purpose: this runs after the webhook has already
 * committed and returned 200 to Meta. An enqueue failure must degrade to "no AI
 * reply", never to a redelivered or lost customer message.
 */
@Injectable()
export class AiTurnListener {
  constructor(private readonly enqueue: AiTurnEnqueueService) {}

  @OnEvent(INBOX_MESSAGE_RECEIVED_EVENT, { async: true, suppressErrors: true })
  async onMessage(event: InboxMessageReceivedEvent): Promise<void> {
    await this.enqueue.enqueue(event.conversationId);
  }
}
