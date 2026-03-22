import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  ContinueStoryRequestDto,
  InitStoryRequestDto,
  StoryActionsDto,
  StoryChunkDto,
  StoryChunkVariantsDto,
  StorySettingsDto,
} from './dto/story.dto';
import { GeminiService } from './providers/gemini.service';
import { OpenRouterService } from './providers/openrouter.service';
import { getStoryContinuationPrompt } from './prompts/get-story-continuation-prompt';
import { getStoryInitializationPrompt } from './prompts/get-story-initialization-prompt';
import { storyContinuationSystemPrompt } from './prompts/story-continuation-system-prompt';
import { storyInitializationSystemPrompt } from './prompts/story-initialization-system-prompt';

@Injectable()
export class AiService {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly openRouterService: OpenRouterService,
  ) {}

  async initStory(request: InitStoryRequestDto): Promise<StoryChunkDto> {
    this.validateSettings(request.settings);
    this.validateCards(request.cards);

    const prompt = getStoryInitializationPrompt(
      storyInitializationSystemPrompt,
      request.settings,
      request.cards,
    );

    const response = await this.generateText(prompt);

    return this.parseStoryChunkResponse(response.text);
  }

  async continueStory(
    request: ContinueStoryRequestDto,
  ): Promise<StoryChunkVariantsDto> {
    if (!request.story?.trim()) {
      throw new BadRequestException('story is required');
    }

    this.validateActions(request.actions);
    this.validateSettings(request.settings);
    this.validateCards(request.cards);

    const prompt = getStoryContinuationPrompt(
      request.story.trim(),
      storyContinuationSystemPrompt,
      request.settings,
      request.actions,
      request.cards,
    );

    const response = await this.generateText(prompt);

    return this.parseStoryChunkVariantsResponse(response.text);
  }

  private async generateText(prompt: string) {
    if (!prompt.trim()) {
      throw new BadRequestException('prompt generation failed');
    }

    // try {
    //   return await this.geminiService.generate({ prompt });
    // } catch {
    try {
      return await this.openRouterService.generate({ prompt });
    } catch {
      throw new BadGatewayException('Both Gemini and OpenRouter failed');
    }
  }
  // }

  private validateSettings(settings?: StorySettingsDto) {
    if (!settings) {
      throw new BadRequestException('settings is required');
    }

    const requiredStringFields: Array<keyof StorySettingsDto> = [
      'educationLanguage',
      'setting',
    ];

    for (const field of requiredStringFields) {
      if (!this.isNonEmptyString(settings[field])) {
        throw new BadRequestException(`${field} is required`);
      }
    }

    if (
      !Number.isFinite(settings.chunkLength) ||
      Math.trunc(settings.chunkLength) <= 0
    ) {
      throw new BadRequestException('chunkLength must be a positive number');
    }

    if (
      !Number.isFinite(settings.storyLanguageDifficulty) ||
      Math.trunc(settings.storyLanguageDifficulty) < 1 ||
      Math.trunc(settings.storyLanguageDifficulty) > 6
    ) {
      throw new BadRequestException(
        'storyLanguageDifficulty must be between 1 and 6',
      );
    }

    if (!Array.isArray(settings.genres)) {
      throw new BadRequestException('genres must be an array');
    }

    const hasEmptyGenre = settings.genres.some(
      (genre) => !this.isNonEmptyString(genre),
    );

    if (hasEmptyGenre) {
      throw new BadRequestException('genres must contain non-empty strings');
    }
  }

  private validateCards(cards?: InitStoryRequestDto['cards']) {
    if (!Array.isArray(cards)) {
      throw new BadRequestException('cards must be an array');
    }

    const hasInvalidCard = cards.some(
      (card) =>
        !card ||
        typeof card !== 'object' ||
        !this.isNonEmptyString(card.id) ||
        !this.isNonEmptyString(card.text),
    );

    if (hasInvalidCard) {
      throw new BadRequestException(
        'each card must contain non-empty id and text',
      );
    }
  }

  private validateActions(actions?: StoryActionsDto) {
    if (!actions) {
      throw new BadRequestException('actions is required');
    }

    if (
      !this.isNonEmptyString(actions.action1) ||
      !this.isNonEmptyString(actions.action2)
    ) {
      throw new BadRequestException(
        'actions.action1 and actions.action2 are required',
      );
    }
  }

  private parseStoryChunkResponse(rawText: string): StoryChunkDto {
    const parsed = this.parseJson(rawText);

    if (!this.isStoryChunkDto(parsed)) {
      throw new BadGatewayException(
        'AI returned an invalid story initialization payload',
      );
    }

    return this.normalizeStoryChunk(parsed);
  }

  private parseStoryChunkVariantsResponse(
    rawText: string,
  ): StoryChunkVariantsDto {
    const parsed = this.parseJson(rawText);

    if (!this.isStoryChunkVariantsDto(parsed)) {
      throw new BadGatewayException(
        'AI returned an invalid story continuation payload',
      );
    }

    return {
      chunk1: this.normalizeStoryChunk(parsed.chunk1),
      chunk2: this.normalizeStoryChunk(parsed.chunk2),
    };
  }

  private parseJson(rawText: string): unknown {
    const normalized = rawText.trim();

    const directJson = this.tryParseJson(normalized);
    if (directJson !== null) {
      return directJson;
    }

    const match = normalized.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match?.[1]) {
      const fencedJson = this.tryParseJson(match[1].trim());
      if (fencedJson !== null) {
        return fencedJson;
      }
    }

    const start = normalized.indexOf('{');
    const end = normalized.lastIndexOf('}');

    if (start !== -1 && end !== -1 && end > start) {
      const slicedJson = this.tryParseJson(normalized.slice(start, end + 1));
      if (slicedJson !== null) {
        return slicedJson;
      }
    }

    throw new BadGatewayException('AI returned invalid JSON');
  }

  private tryParseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private isStoryChunkDto(value: unknown): value is StoryChunkDto {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as StoryChunkDto;

    return (
      typeof candidate.text === 'string' &&
      !!candidate.text.trim() &&
      !!candidate.actions &&
      typeof candidate.actions.action1 === 'string' &&
      !!candidate.actions.action1.trim() &&
      typeof candidate.actions.action2 === 'string' &&
      !!candidate.actions.action2.trim()
    );
  }

  private isStoryChunkVariantsDto(
    value: unknown,
  ): value is StoryChunkVariantsDto {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as StoryChunkVariantsDto;

    return (
      this.isStoryChunkDto(candidate.chunk1) &&
      this.isStoryChunkDto(candidate.chunk2)
    );
  }

  private normalizeStoryChunk(chunk: StoryChunkDto): StoryChunkDto {
    return {
      text: chunk.text.trim(),
      actions: {
        action1: chunk.actions.action1.trim(),
        action2: chunk.actions.action2.trim(),
      },
    };
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }
}
