import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { PullSyncUseCase } from './application/use-cases/pull-sync.use-case';
import { PushSyncUseCase } from './application/use-cases/push-sync.use-case';
import { SyncPullRepository } from './infrastructure/repositories/sync-pull.repository';
import { SyncPushRepository } from './infrastructure/repositories/sync-push.repository';
import { SyncController } from './presentation/sync.controller';

@Module({
  controllers: [SyncController],
  providers: [
    JwtAuthGuard,
    SyncPullRepository,
    SyncPushRepository,
    PullSyncUseCase,
    PushSyncUseCase,
  ],
})
export class SyncModule {}
