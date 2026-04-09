import { Injectable } from '@nestjs/common';
import {
  InitStoryRequestDto,
  StoryChunkDto,
} from '../../presentation/dto/story.dto';
import { getStoryInitializationPrompt } from '../../infrastructure/prompts/get-story-initialization-prompt';
import { storyInitializationSystemPrompt } from '../../infrastructure/prompts/story-initialization-system-prompt';
import { StoryResponseParserService } from '../services/story-response-parser.service';
import { StoryTextGenerationService } from '../services/story-text-generation.service';

@Injectable()
export class InitStoryUseCase {
  constructor(
    private readonly storyTextGenerationService: StoryTextGenerationService,
    private readonly storyResponseParserService: StoryResponseParserService,
  ) {}

  async execute(request: InitStoryRequestDto): Promise<StoryChunkDto> {
    const prompt = getStoryInitializationPrompt(
      storyInitializationSystemPrompt,
      request.settings,
      request.cards,
    );

    const response = await this.storyTextGenerationService.generateText(prompt);

    return this.storyResponseParserService.parseStoryChunkResponse(
      response.text,
    );
  }
}
