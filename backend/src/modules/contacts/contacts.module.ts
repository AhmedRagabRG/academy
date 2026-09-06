import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactPolicy } from './contact.policy';
import { ContactRepository } from './contact.repository';
import { ContactService } from './contact.service';

@Module({
  controllers: [ContactController],
  providers: [ContactPolicy, ContactRepository, ContactService],
  exports: [ContactService, ContactRepository],
})
export class ContactsModule {}
