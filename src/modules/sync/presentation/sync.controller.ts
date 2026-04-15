import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import type { AuthenticatedRequestUser } from '../../../common/auth/authenticated-request-user.type';
import { PullSyncUseCase } from '../application/use-cases/pull-sync.use-case';
import { PushSyncUseCase } from '../application/use-cases/push-sync.use-case';
import { PullSyncQueryDto } from './dto/pull-sync-query.dto';
import { PushSyncDto } from './dto/push-sync.dto';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(
    private readonly pushSyncUseCase: PushSyncUseCase,
    private readonly pullSyncUseCase: PullSyncUseCase,
  ) {}

  @Post('push')
  push(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: PushSyncDto,
  ) {
    return this.pushSyncUseCase.execute(user.sub, body);
  }

  @Get('pull')
  pull(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() query: PullSyncQueryDto,
  ) {
    return this.pullSyncUseCase.execute(user.sub, query);
  }
}
