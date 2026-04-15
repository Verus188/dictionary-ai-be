import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import {
  DictionaryCardSyncEntity,
  PullSyncChange,
  PullSyncResponse,
  SettingSyncEntity,
} from '../../application/types/sync-contracts.type';
import { rethrowSyncPersistenceError } from './rethrow-sync-persistence-error';

@Injectable()
export class SyncPullRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async pull(
    userId: string,
    cursor: bigint,
    limit: number,
  ): Promise<PullSyncResponse> {
    try {
      const rows = await this.prismaService.syncChangeLog.findMany({
        where: {
          userId,
          cursor: {
            gt: cursor,
          },
        },
        orderBy: {
          cursor: 'asc',
        },
        take: limit + 1,
      });

      const hasMore = rows.length > limit;
      const visibleRows = hasMore ? rows.slice(0, limit) : rows;
      const changes = visibleRows.map(
        (row) =>
          ({
            cursor: Number(row.cursor),
            entityType: row.entityType,
            changeType: row.changeType,
            entity: row.payload as DictionaryCardSyncEntity | SettingSyncEntity,
          }) satisfies PullSyncChange,
      );

      return {
        cursor: changes.at(-1)?.cursor ?? Number(cursor),
        hasMore,
        changes,
      };
    } catch (error) {
      rethrowSyncPersistenceError(error);
    }
  }
}
