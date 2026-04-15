import { Injectable } from '@nestjs/common';
import { PullSyncQueryDto } from '../../presentation/dto/pull-sync-query.dto';
import { PullSyncResponse } from '../types/sync-contracts.type';
import { SyncPullRepository } from '../../infrastructure/repositories/sync-pull.repository';

@Injectable()
export class PullSyncUseCase {
  constructor(private readonly syncPullRepository: SyncPullRepository) {}

  execute(userId: string, query: PullSyncQueryDto): Promise<PullSyncResponse> {
    const cursor = query.cursor ? BigInt(query.cursor) : 0n;

    return this.syncPullRepository.pull(userId, cursor, query.limit ?? 200);
  }
}
