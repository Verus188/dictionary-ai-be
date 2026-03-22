import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { ContinueStoryRequestDto, InitStoryRequestDto } from './dto/story.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('story/init')
  initStory(@Body() body: InitStoryRequestDto) {
    return this.aiService.initStory(body);
  }

  @Post('story/continue')
  continueStory(@Body() body: ContinueStoryRequestDto) {
    return this.aiService.continueStory(body);
  }
}
