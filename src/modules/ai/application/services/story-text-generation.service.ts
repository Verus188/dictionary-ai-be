import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { GeminiService } from '../../infrastructure/providers/gemini.service';
import { OpenRouterService } from '../../infrastructure/providers/openrouter.service';

@Injectable()
export class StoryTextGenerationService {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly openRouterService: OpenRouterService,
  ) {}

  async generateText(prompt: string) {
    if (!prompt.trim()) {
      throw new BadRequestException('prompt generation failed');
    }

    try {
      return await this.openRouterService.generate({ prompt });
    } catch {
      try {
        return await this.geminiService.generate({ prompt });
      } catch {
        throw new BadGatewayException('Both Gemini and OpenRouter failed');
      }
    }
  }
}
