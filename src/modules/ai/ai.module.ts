import { Module } from '@nestjs/common';
import { OpenRouterService } from './infrastructure/providers/openrouter.service';
import { AiController } from './presentation/ai.controller';
import { StoryTextGenerationService } from './application/services/story-text-generation.service';
import { StoryResponseParserService } from './application/services/story-response-parser.service';
import { InitStoryUseCase } from './application/use-cases/init-story.use-case';
import { ContinueStoryUseCase } from './application/use-cases/continue-story.use-case';

@Module({
  controllers: [AiController],
  providers: [
    OpenRouterService,
    StoryTextGenerationService,
    StoryResponseParserService,
    InitStoryUseCase,
    ContinueStoryUseCase,
  ],
})
export class AiModule {}
