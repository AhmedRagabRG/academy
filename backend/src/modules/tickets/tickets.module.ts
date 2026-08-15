import { Module } from '@nestjs/common';
import { StorageModule } from '../../storage/storage.module';
import { TicketController } from './ticket.controller';
import { TicketPolicy } from './ticket.policy';
import { TicketRepository } from './ticket.repository';
import { TicketService } from './ticket.service';

@Module({
  imports: [StorageModule],
  controllers: [TicketController],
  providers: [TicketPolicy, TicketRepository, TicketService],
  exports: [TicketService],
})
export class TicketsModule {}
