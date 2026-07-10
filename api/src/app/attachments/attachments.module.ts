import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { attachmentsConfigProvider } from './attachments-config';
import { AttachmentsService } from './attachments.service';

@Module({
  controllers: [AttachmentsController],
  providers: [AttachmentsService, attachmentsConfigProvider],
})
export class AttachmentsModule {}
