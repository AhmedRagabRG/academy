import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { DomainEventBus } from './events/domain-event.bus';
@Module({
  imports: [AuthModule, AuthorizationModule],
  providers: [DomainEventBus],
  exports: [AuthModule, AuthorizationModule, DomainEventBus],
})
export class CoreModule {}
