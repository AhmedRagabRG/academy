import { Module } from '@nestjs/common';
import { BranchScopeService } from './branch-scope.service';
import { PermissionsGuard } from './permissions.guard';
import { RecordPermissionsHelper } from './record-permissions.helper';
@Module({
  providers: [PermissionsGuard, BranchScopeService, RecordPermissionsHelper],
  exports: [PermissionsGuard, BranchScopeService, RecordPermissionsHelper],
})
export class AuthorizationModule {}
