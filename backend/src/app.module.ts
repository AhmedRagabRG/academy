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
import { CatalogModule } from './modules/catalog/catalog.module';
import { ProgramBatchesModule } from './modules/program-batches/program-batches.module';
import { AdmissionsModule } from './modules/admissions/admissions.module';
import { StudentsModule } from './modules/students/students.module';
import { StudentFinanceModule } from './modules/student-finance/student-finance.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { InboxModule } from './modules/inbox/inbox.module';

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
    CatalogModule,
    ProgramBatchesModule,
    AdmissionsModule,
    StudentsModule,
    StudentFinanceModule,
    AccountingModule,
    TicketsModule,
    InboxModule,
  ],
  providers: [
    { provide: APP_GUARD, useExisting: AuthGuard },
    { provide: APP_GUARD, useExisting: PermissionsGuard },
  ],
})
export class AppModule {}
