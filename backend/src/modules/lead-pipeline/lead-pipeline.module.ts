import { Module } from '@nestjs/common';
import { ContactsModule } from '../contacts/contacts.module';
import { LeadController } from './lead.controller';
import { LeadPolicy } from './lead.policy';
import { LeadService } from './lead.service';
import { PipelineAdminController } from './pipeline-admin.controller';
import { PipelineAdminService } from './pipeline-admin.service';

@Module({
  imports: [ContactsModule],
  controllers: [LeadController, PipelineAdminController],
  providers: [LeadPolicy, LeadService, PipelineAdminService],
  exports: [LeadService, PipelineAdminService],
})
export class LeadPipelineModule {}
