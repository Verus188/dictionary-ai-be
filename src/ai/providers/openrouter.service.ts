import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios from 'axios';

interface OpenRouterGenerateParams {
  prompt: string;
  temperature?: number;
}

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);
  private readonly endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly models = [
    'deepseek/deepseek-v3.2',
    'google/gemini-3-flash-preview',
    'openrouter/hunter-alpha',
    'openrouter/healer-alpha',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'stepfun/step-3.5-flash:free',
  ];

  async generate({ prompt, temperature }: OpenRouterGenerateParams) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'OPENROUTER_API_KEY is not configured',
      );
    }

    const requestWithModel = async (modelIndex: number) => {
      const selectedModel = this.models[modelIndex];

      if (!selectedModel) {
        throw new BadGatewayException('All OpenRouter models failed');
      }

      try {
        const response = await axios.post<{
          choices?: Array<{
            message?: {
              content?: string | Array<{ type?: string; text?: string }>;
            };
          }>;
        }>(
          this.endpoint,
          {
            model: selectedModel,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            timeout: 30_000,
          },
        );

        const data = response.data;
        const rawContent = data.choices?.[0]?.message?.content;
        const text =
          typeof rawContent === 'string'
            ? rawContent.trim()
            : rawContent
                ?.map((part) => part.text ?? '')
                .join('')
                .trim();

        if (!text) {
          throw new BadGatewayException(
            'OpenRouter returned an empty response',
          );
        }

        return {
          provider: 'openrouter' as const,
          model: selectedModel,
          text,
        };
      } catch (error) {
        if (error instanceof BadGatewayException) {
          this.logger.error(
            `OpenRouter failed. model=${selectedModel}`,
            error.stack,
          );

          if (modelIndex < this.models.length - 1) {
            return requestWithModel(modelIndex + 1);
          }

          throw error;
        }

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const errorPayload =
            typeof error.response?.data === 'string'
              ? error.response.data
              : JSON.stringify(error.response?.data);

          this.logger.error(
            `OpenRouter request failed. status=${status ?? 'unknown'} model=${selectedModel}`,
            error.stack,
          );

          if (modelIndex < this.models.length - 1) {
            return requestWithModel(modelIndex + 1);
          }

          if (error.code === 'ECONNABORTED') {
            throw new BadGatewayException('OpenRouter request timed out');
          }

          throw new BadGatewayException(
            `OpenRouter request failed with status ${status ?? 'unknown'}: ${errorPayload}`,
          );
        }

        this.logger.error(
          `OpenRouter failed. model=${selectedModel}`,
          JSON.stringify(error),
        );

        if (modelIndex < this.models.length - 1) {
          return requestWithModel(modelIndex + 1);
        }

        throw new BadGatewayException('Failed to call OpenRouter provider');
      }
    };

    return requestWithModel(0);
  }
}
