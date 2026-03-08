import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { GenerateAiDto } from './dto/generate-ai.dto';
import { GeminiService } from './providers/gemini.service';
import { OpenRouterService } from './providers/openrouter.service';

@Injectable()
export class AiService {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly openRouterService: OpenRouterService,
  ) {}

  async generate(request: GenerateAiDto) {
    const prompt = request.prompt?.trim();

    if (!prompt) {
      throw new BadRequestException('prompt is required');
    }

    if (request.temperature !== undefined) {
      const isValidTemperature =
        request.temperature >= 0 && request.temperature <= 2;

      if (!isValidTemperature) {
        throw new BadRequestException('temperature must be between 0 and 2');
      }
    }

    try {
      return await this.geminiService.generate({
        prompt,
        temperature: request.temperature,
      });
    } catch {
      try {
        return await this.openRouterService.generate({
          prompt,
          temperature: request.temperature,
        });
      } catch {
        throw new BadGatewayException('Both Gemini and OpenRouter failed');
      }
    }
  }
}
