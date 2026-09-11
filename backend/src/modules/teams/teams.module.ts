import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { TeamRepository } from './team.repository';
import { TeamService } from './team.service';

/**
 * Teams have their own module because both tickets and the inbox consume them
 * and neither owns them — the table had no service at all until now, which is
 * why a team could only be created by re-seeding the database.
 */
@Module({
  controllers: [TeamController],
  providers: [TeamService, TeamRepository],
  exports: [TeamService],
})
export class TeamsModule {}
