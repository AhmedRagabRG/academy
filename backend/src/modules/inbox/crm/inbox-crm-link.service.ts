import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ContactService } from '../../contacts/contact.service';
import type { ContactSourceCode } from '../../contacts/dto/contact.dto';
import { LeadService } from '../../lead-pipeline/lead.service';

const SOURCE_BY_PLATFORM: Record<string, ContactSourceCode> = {
  whatsapp: 'whatsapp',
  messenger: 'facebook',
  instagram: 'instagram',
  web: 'website',
  phone: 'phone',
  email: 'manual',
};

export interface InboxCrmLinkInput {
  organizationId: string;
  customerId: string;
  /** The inbox customer's normalized identity, reused as the contact key. */
  identity: string;
  name: string;
  phone: string;
  platformCode: string;
  platformLabel?: string;
  occurredAt: Date;
}

/**
 * Keeps every inbox customer mirrored into the CRM: one contact, and one open
 * pipeline lead. Runs on inbound ingestion so a conversation is never a dead
 * end — the sales side sees the opportunity the moment the first message lands.
 */
@Injectable()
export class InboxCrmLinkService {
  constructor(
    private readonly db: PrismaService,
    private readonly contacts: ContactService,
    private readonly leads: LeadService,
  ) {}

  static sourceFor(platformCode: string): ContactSourceCode {
    return SOURCE_BY_PLATFORM[platformCode] ?? 'manual';
  }

  async link(input: InboxCrmLinkInput): Promise<void> {
    const contact = await this.contacts.ensureFromChannel({
      organizationId: input.organizationId,
      identity: input.identity,
      name: input.name,
      phone: input.phone,
      source: InboxCrmLinkService.sourceFor(input.platformCode),
      channelHandle: input.platformLabel,
      occurredAt: input.occurredAt,
    });
    await this.db.inboxCustomer.update({
      where: { id: input.customerId },
      data: { contactId: contact.id },
    });
    await this.leads.ensureFromChannel({
      organizationId: input.organizationId,
      contactId: contact.id,
      occurredAt: input.occurredAt,
    });
  }

  /** Contact and open lead attached to a conversation's customer, if any. */
  async summary(customerId: string) {
    const customer = await this.db.inboxCustomer.findUnique({
      where: { id: customerId },
      select: { contactId: true },
    });
    if (!customer?.contactId) return null;
    const lead = await this.leads.openLeadForContact(customer.contactId);
    if (!lead) return { contactId: customer.contactId, lead: null };
    const stage = await this.db.pipelineStage.findUnique({
      where: { id: lead.stageId },
      select: { id: true, code: true, name: true },
    });
    return {
      contactId: customer.contactId,
      lead: {
        id: lead.id,
        pipelineId: lead.pipelineId,
        stageId: stage?.code ?? '',
        stageRecordId: lead.stageId,
        stageName: stage?.name ?? '',
      },
    };
  }
}
