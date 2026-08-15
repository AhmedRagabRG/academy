import { Module } from '@nestjs/common';
import { StorageModule } from '../../storage/storage.module';
import { INBOX_DELIVERY_PORT } from './delivery/inbox-delivery.port';
import { LocalInboxDeliveryAdapter } from './delivery/local-inbox-delivery.adapter';
import { MetaInboxDeliveryAdapter } from './delivery/meta-inbox-delivery.adapter';
import { ChannelInboxDeliveryAdapter } from './delivery/channel-inbox-delivery.adapter';
import { InboxController } from './inbox.controller';
import { InboxPolicy } from './inbox.policy';
import { InboxRepository } from './inbox.repository';
import { InboxService } from './inbox.service';
import { InboxRealtimeService } from './inbox-realtime.service';
import { MetaWebhookController } from './meta/meta-webhook.controller';
import { MetaWebhookService } from './meta/meta-webhook.service';

@Module({
  imports: [StorageModule],
  controllers: [InboxController, MetaWebhookController],
  providers: [
    InboxPolicy,
    InboxRepository,
    InboxService,
    InboxRealtimeService,
    MetaWebhookService,
    LocalInboxDeliveryAdapter,
    MetaInboxDeliveryAdapter,
    ChannelInboxDeliveryAdapter,
    { provide: INBOX_DELIVERY_PORT, useExisting: ChannelInboxDeliveryAdapter },
  ],
  exports: [InboxService],
})
export class InboxModule {}
