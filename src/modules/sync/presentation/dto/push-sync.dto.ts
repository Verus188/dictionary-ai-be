import { Type } from 'class-transformer';
import {
  Allow,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import type {
  SyncEntityType,
  SyncMutationType,
} from '../../application/types/sync-contracts.type';

export class SyncOperationDto {
  @IsString()
  @IsNotEmpty()
  operationId!: string;

  @IsIn(['dictionaryCard', 'setting'] satisfies SyncEntityType[])
  entityType!: SyncEntityType;

  @IsIn(['upsert', 'delete'] satisfies SyncMutationType[])
  operationType!: SyncMutationType;

  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @IsDateString()
  clientUpdatedAt!: string;

  @Allow()
  payload!: unknown | null;
}

export class PushSyncDto {
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operations!: SyncOperationDto[];
}
