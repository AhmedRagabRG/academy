import { Module } from '@nestjs/common';
import { StorageModule } from '../../storage/storage.module';
import { ContactsModule } from '../contacts/contacts.module';
import { LeadPipelineModule } from '../lead-pipeline/lead-pipeline.module';
import { ChannelController } from './channels/channel.controller';
import { ChannelCredentialsService } from './channels/channel-credentials.service';
import { ChannelCryptoService } from './channels/channel-crypto.service';
import { ChannelLinkingStore } from './channels/channel-linking.store';
import { ChannelService } from './channels/channel.service';
import { MetaGraphClient } from './channels/meta-graph.client';
import { InboxCrmLinkService } from './crm/inbox-crm-link.service';
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
  imports: [StorageModule, ContactsModule, LeadPipelineModule],
  // ChannelController first: its `inbox/channels` path would otherwise be
  // swallowed by InboxController's single-segment `inbox/:id` route.
  controllers: [ChannelController, MetaWebhookController, InboxController],
  providers: [
    InboxPolicy,
    InboxRepository,
    InboxService,
    InboxRealtimeService,
    InboxCrmLinkService,
    MetaWebhookService,
    MetaGraphClient,
    ChannelCryptoService,
    ChannelCredentialsService,
    ChannelLinkingStore,
    ChannelService,
    LocalInboxDeliveryAdapter,
    MetaInboxDeliveryAdapter,
    ChannelInboxDeliveryAdapter,
    { provide: INBOX_DELIVERY_PORT, useExisting: ChannelInboxDeliveryAdapter },
  ],
  // The channel credentials and Graph client are the single place a Meta
  // token is resolved, so the campaigns module reuses them rather than
  // re-implementing token lookup.
  exports: [InboxService, ChannelCredentialsService, MetaGraphClient],
})
export class InboxModule {}
