import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerateAiDto } from './dto/generate-ai.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate')
  generate(@Body() body: GenerateAiDto) {
    return this.aiService.generate(body);
  }
}
