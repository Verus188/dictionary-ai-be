import { SyncSettingKey } from './sync-setting-key.type';
import { SyncEntityType, SyncMutationType } from './sync-contracts.type';

type BaseParsedSyncOperation = {
  operationId: string;
  entityId: string;
  clientUpdatedAt: string;
};

export type ParsedDictionaryCardUpsertOperation = BaseParsedSyncOperation & {
  entityType: 'dictionaryCard';
  operationType: 'upsert';
  payload: {
    id: string;
    card: string;
    normalizedCard: string;
  };
};

export type ParsedDictionaryCardDeleteOperation = BaseParsedSyncOperation & {
  entityType: 'dictionaryCard';
  operationType: 'delete';
  payload: null;
};

export type ParsedSettingUpsertOperation = BaseParsedSyncOperation & {
  entityType: 'setting';
  operationType: 'upsert';
  payload: {
    key: SyncSettingKey;
    value: unknown | null;
  };
};

export type ParsedSettingDeleteOperation = BaseParsedSyncOperation & {
  entityType: 'setting';
  operationType: 'delete';
  payload: null;
};

export type ParsedSyncOperation =
  | ParsedDictionaryCardUpsertOperation
  | ParsedDictionaryCardDeleteOperation
  | ParsedSettingUpsertOperation
  | ParsedSettingDeleteOperation;

export type RawSyncOperation = {
  operationId: string;
  entityType: SyncEntityType;
  operationType: SyncMutationType;
  entityId: string;
  clientUpdatedAt: string;
  payload: unknown | null;
};
