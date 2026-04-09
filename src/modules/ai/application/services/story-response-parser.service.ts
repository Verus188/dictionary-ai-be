import { BadGatewayException, Injectable } from '@nestjs/common';
import {
  StoryChunkDto,
  StoryChunkVariantsDto,
} from '../../presentation/dto/story.dto';
import { isStoryContinuationResponse } from '../../infrastructure/prompts/story-continuation-system-prompt';
import { isStoryInitializationResponse } from '../../infrastructure/prompts/story-initialization-system-prompt';

@Injectable()
export class StoryResponseParserService {
  parseStoryChunkResponse(rawText: string): StoryChunkDto {
    const parsed = this.parseJson(rawText);

    if (!isStoryInitializationResponse(parsed)) {
      throw new BadGatewayException(
        'AI returned an invalid story initialization payload',
      );
    }

    return this.normalizeStoryChunk(parsed);
  }

  parseStoryChunkVariantsResponse(rawText: string): StoryChunkVariantsDto {
    const parsed = this.parseJson(rawText);

    if (!isStoryContinuationResponse(parsed)) {
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

  private normalizeStoryChunk(chunk: StoryChunkDto): StoryChunkDto {
    return {
      text: chunk.text.trim(),
      actions: {
        action1: chunk.actions.action1.trim(),
        action2: chunk.actions.action2.trim(),
      },
    };
  }
}
