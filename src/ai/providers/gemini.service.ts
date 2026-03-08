import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

interface GeminiGenerateParams {
  prompt: string;
  model?: string;
  temperature?: number;
}

@Injectable()
export class GeminiService {
  async generate({ prompt, model, temperature }: GeminiGenerateParams) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'GEMINI_API_KEY is not configured',
      );
    }

    const selectedModel =
      model ?? process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
    const google = createGoogleGenerativeAI({ apiKey });
    const languageModel = google(selectedModel);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const result = await generateText({
        model: languageModel,
        prompt,
        temperature,
        abortSignal: controller.signal,
      });

      const text = result.text.trim();

      if (!text) {
        throw new BadGatewayException('Gemini returned an empty response');
      }

      return {
        provider: 'gemini' as const,
        model: selectedModel,
        text,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new BadGatewayException('Gemini request timed out');
      }

      throw new BadGatewayException('Failed to call Gemini provider');
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
