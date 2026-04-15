import { SyncSettingKey } from './sync-setting-key.type';

export type SyncEntityType = 'dictionaryCard' | 'setting';
export type SyncMutationType = 'upsert' | 'delete';

export type DictionaryCardSyncEntity = {
  id: string;
  card: string;
  updatedAt: string;
  deletedAt: string | null;
  serverRevision: number;
};

export type SettingSyncEntity = {
  key: SyncSettingKey;
  value: unknown | null;
  updatedAt: string;
  deletedAt: string | null;
  serverRevision: number;
};

export type PushSyncResult = {
  operationId: string;
  status: 'applied' | 'noop' | 'ignored';
  entityType: SyncEntityType;
  entityId: string;
  serverRevision?: number;
};

export type PushSyncConflict = {
  operationId: string;
  type: 'dictionary_duplicate_merged';
  entityType: 'dictionaryCard';
  submittedEntityId: string;
  canonicalEntity: DictionaryCardSyncEntity;
};

export type PushSyncResponse = {
  results: PushSyncResult[];
  conflicts: PushSyncConflict[];
};

export type PullSyncChange = {
  cursor: number;
  entityType: SyncEntityType;
  changeType: SyncMutationType;
  entity: DictionaryCardSyncEntity | SettingSyncEntity;
};

export type PullSyncResponse = {
  cursor: number;
  hasMore: boolean;
  changes: PullSyncChange[];
};
