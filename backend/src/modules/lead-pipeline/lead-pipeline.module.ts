import { Module } from '@nestjs/common';
import { ContactsModule } from '../contacts/contacts.module';
import { LeadController } from './lead.controller';
import { LeadPolicy } from './lead.policy';
import { LeadService } from './lead.service';

@Module({
  imports: [ContactsModule],
  controllers: [LeadController],
  providers: [LeadPolicy, LeadService],
  exports: [LeadService],
})
export class LeadPipelineModule {}
