import { Module } from '@nestjs/common';
import { OpenAiClient } from './llm/openai.client';

@Module({ providers: [OpenAiClient], exports: [OpenAiClient] })
export class AiModule {}
