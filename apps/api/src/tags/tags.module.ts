import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

/** User-defined tags: CRUD + detach-on-delete (FR-TAG-01/03). */
@Module({
  controllers: [TagsController],
  providers: [TagsService],
})
export class TagsModule {}
