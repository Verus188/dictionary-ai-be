import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiService } from './providers/gemini.service';
import { OpenRouterService } from './providers/openrouter.service';

@Module({
  controllers: [AiController],
  providers: [AiService, GeminiService, OpenRouterService],
})
export class AiModule {}
