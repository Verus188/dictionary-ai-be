import { BadRequestException, Injectable } from '@nestjs/common';
import { OpenRouterService } from '../../infrastructure/providers/openrouter.service';

@Injectable()
export class StoryTextGenerationService {
  constructor(private readonly openRouterService: OpenRouterService) {}

  async generateText(prompt: string) {
    if (!prompt.trim()) {
      throw new BadRequestException('prompt generation failed');
    }

    return this.openRouterService.generate({ prompt });
  }
}
