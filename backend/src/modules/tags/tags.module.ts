import { Module } from '@nestjs/common';
import { TagController } from './tag.controller';
import { TagRepository } from './tag.repository';
import { TagService } from './tag.service';

/**
 * Inbox tags had no management surface: the five that existed came from the
 * seed, and nothing could add or retire one.
 */
@Module({
  controllers: [TagController],
  providers: [TagService, TagRepository],
  exports: [TagService],
})
export class TagsModule {}
