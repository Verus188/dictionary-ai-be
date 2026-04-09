import { Injectable } from '@nestjs/common';
import {
  ContinueStoryRequestDto,
  StoryChunkVariantsDto,
} from '../../presentation/dto/story.dto';
import { getStoryContinuationPrompt } from '../../infrastructure/prompts/get-story-continuation-prompt';
import { storyContinuationSystemPrompt } from '../../infrastructure/prompts/story-continuation-system-prompt';
import { StoryResponseParserService } from '../services/story-response-parser.service';
import { StoryTextGenerationService } from '../services/story-text-generation.service';

@Injectable()
export class ContinueStoryUseCase {
  constructor(
    private readonly storyTextGenerationService: StoryTextGenerationService,
    private readonly storyResponseParserService: StoryResponseParserService,
  ) {}

  async execute(
    request: ContinueStoryRequestDto,
  ): Promise<StoryChunkVariantsDto> {
    const prompt = getStoryContinuationPrompt(
      request.story.trim(),
      storyContinuationSystemPrompt,
      request.settings,
      request.actions,
      request.cards,
    );

    const response = await this.storyTextGenerationService.generateText(prompt);

    return this.storyResponseParserService.parseStoryChunkVariantsResponse(
      response.text,
    );
  }
}
