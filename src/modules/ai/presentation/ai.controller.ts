import { Body, Controller, Post } from '@nestjs/common';
import { ContinueStoryRequestDto, InitStoryRequestDto } from './dto/story.dto';
import { ContinueStoryUseCase } from '../application/use-cases/continue-story.use-case';
import { InitStoryUseCase } from '../application/use-cases/init-story.use-case';

@Controller('ai')
export class AiController {
  constructor(
    private readonly initStoryUseCase: InitStoryUseCase,
    private readonly continueStoryUseCase: ContinueStoryUseCase,
  ) {}

  @Post('story/init')
  initStory(@Body() body: InitStoryRequestDto) {
    return this.initStoryUseCase.execute(body);
  }

  @Post('story/continue')
  continueStory(@Body() body: ContinueStoryRequestDto) {
    return this.continueStoryUseCase.execute(body);
  }
}
