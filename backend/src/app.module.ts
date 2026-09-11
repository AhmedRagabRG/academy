import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import { configuration } from './config/configuration';
import { validate } from './config/env.validation';
import { AuthGuard } from './core/auth/auth.guard';
import { PermissionsGuard } from './core/authorization/permissions.guard';
import { CoreModule } from './core/core.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { StorageModule } from './storage/storage.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { TeamsModule } from './modules/teams/teams.module';
import { TagsModule } from './modules/tags/tags.module';
import { BranchesModule } from './modules/branches/branches.module';
import { InboxModule } from './modules/inbox/inbox.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { LeadPipelineModule } from './modules/lead-pipeline/lead-pipeline.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate, load: configuration }),
    EventEmitterModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req) =>
          req.headers['x-request-id']?.toString() ?? crypto.randomUUID(),
        redact: [
          'req.headers.cookie',
          'req.headers.authorization',
          '*.password',
          '*.passwordHash',
          '*.token',
        ],
        transport:
          process.env.NODE_ENV === 'development'
            ? { target: 'pino-pretty' }
            : undefined,
      },
    }),
    DatabaseModule,
    CoreModule,
    StorageModule,
    HealthModule,
    IdentityModule,
    OrganizationModule,
    TicketsModule,
    TeamsModule,
    TagsModule,
    BranchesModule,
    InboxModule,
    ContactsModule,
    LeadPipelineModule,
    CampaignsModule,
    AiModule.register(),
  ],
  providers: [
    { provide: APP_GUARD, useExisting: AuthGuard },
    { provide: APP_GUARD, useExisting: PermissionsGuard },
  ],
})
export class AppModule {}
