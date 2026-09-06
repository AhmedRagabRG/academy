import { Module } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { RecordPermissionsHelper } from './record-permissions.helper';
@Module({
  providers: [PermissionsGuard, RecordPermissionsHelper],
  exports: [PermissionsGuard, RecordPermissionsHelper],
})
export class AuthorizationModule {}
