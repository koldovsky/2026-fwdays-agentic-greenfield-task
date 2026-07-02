import { Module } from '@nestjs/common';
import { AnthropicService } from './anthropic.service';
import { InsightController } from './insight.controller';
import { InsightService } from './insight.service';

/** The one AI feature: server-side daily insight with a deterministic fallback (FR-INSIGHT-01→06). */
@Module({
  controllers: [InsightController],
  providers: [InsightService, AnthropicService],
})
export class InsightModule {}
