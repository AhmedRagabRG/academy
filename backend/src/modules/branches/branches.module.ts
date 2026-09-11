import { Module } from '@nestjs/common';
import { BranchController } from './branch.controller';
import { BranchRepository } from './branch.repository';
import { BranchService } from './branch.service';

/**
 * Branches were dropped with the academic modules and are reintroduced here as
 * an access-control boundary rather than a label: the visibility rule lives in
 * core/authorization/branch-scope and is applied by every module's policy.
 */
@Module({
  controllers: [BranchController],
  providers: [BranchService, BranchRepository],
  exports: [BranchService],
})
export class BranchesModule {}
