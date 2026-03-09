import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

interface OpenRouterGenerateParams {
  prompt: string;
  temperature?: number;
}

@Injectable()
export class OpenRouterService {
  private readonly endpoint = 'https://openrouter.ai/api/v1/chat/completions';

  async generate({ prompt, temperature }: OpenRouterGenerateParams) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'OPENROUTER_API_KEY is not configured',
      );
    }

    const selectedModel = 'stepfun/step-3.5-flash:free';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorPayload = await response.text();
        throw new BadGatewayException(
          `OpenRouter request failed with status ${response.status}: ${errorPayload}`,
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string | Array<{ type?: string; text?: string }>;
          };
        }>;
      };

      const rawContent = data.choices?.[0]?.message?.content;
      const text =
        typeof rawContent === 'string'
          ? rawContent.trim()
          : rawContent
              ?.map((part) => part.text ?? '')
              .join('')
              .trim();

      if (!text) {
        throw new BadGatewayException('OpenRouter returned an empty response');
      }

      return {
        provider: 'openrouter' as const,
        model: selectedModel,
        text,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException('Failed to call OpenRouter provider');
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
