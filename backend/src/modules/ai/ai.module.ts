import { Module } from '@nestjs/common';
import { InboxModule } from '../inbox/inbox.module';
import { OpenAiClient } from './llm/openai.client';
import { AiResumeSweeper } from './runtime/ai-resume.sweeper';

@Module({
  imports: [InboxModule],
  providers: [OpenAiClient, AiResumeSweeper],
  exports: [OpenAiClient],
})
export class AiModule {}
