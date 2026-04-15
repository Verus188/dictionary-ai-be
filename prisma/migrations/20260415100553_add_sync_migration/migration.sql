/*
  Warnings:

  - Changed the type of `entity_type` on the `sync_applied_operations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `result_kind` on the `sync_applied_operations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `entity_type` on the `sync_change_log` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `change_type` on the `sync_change_log` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SyncEntityType" AS ENUM ('dictionaryCard', 'setting');

-- CreateEnum
CREATE TYPE "SyncOperationType" AS ENUM ('upsert', 'delete');

-- CreateEnum
CREATE TYPE "SyncAppliedResultKind" AS ENUM ('result', 'conflict');

-- AlterTable
ALTER TABLE "sync_applied_operations" DROP COLUMN "entity_type",
ADD COLUMN     "entity_type" "SyncEntityType" NOT NULL,
DROP COLUMN "result_kind",
ADD COLUMN     "result_kind" "SyncAppliedResultKind" NOT NULL;

-- AlterTable
ALTER TABLE "sync_change_log" DROP COLUMN "entity_type",
ADD COLUMN     "entity_type" "SyncEntityType" NOT NULL,
DROP COLUMN "change_type",
ADD COLUMN     "change_type" "SyncOperationType" NOT NULL;
