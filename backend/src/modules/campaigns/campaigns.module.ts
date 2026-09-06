import { Module } from '@nestjs/common';
import { ContactsModule } from '../contacts/contacts.module';
import { InboxModule } from '../inbox/inbox.module';
import { CampaignController } from './campaign.controller';
import { CampaignPolicy } from './campaign.policy';
import { CampaignRepository } from './campaign.repository';
import { CampaignService } from './campaign.service';
import { CampaignDeliveryListener } from './dispatch/campaign-delivery.listener';
import { CampaignDispatcherService } from './dispatch/campaign-dispatcher.service';
import { WhatsappTemplateSender } from './dispatch/whatsapp-template.sender';
import { WhatsappTemplateService } from './templates/whatsapp-template.service';

@Module({
  imports: [ContactsModule, InboxModule],
  controllers: [CampaignController],
  providers: [
    CampaignPolicy,
    CampaignRepository,
    CampaignService,
    WhatsappTemplateService,
    WhatsappTemplateSender,
    CampaignDispatcherService,
    CampaignDeliveryListener,
  ],
  exports: [CampaignService],
})
export class CampaignsModule {}
