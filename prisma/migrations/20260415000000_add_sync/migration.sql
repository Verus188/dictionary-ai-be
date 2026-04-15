CREATE SEQUENCE "sync_revision_sequence" AS BIGINT START WITH 1 INCREMENT BY 1;

CREATE TABLE "user_dictionary_cards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "card" TEXT NOT NULL,
    "normalized_card" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "server_revision" BIGINT NOT NULL,

    CONSTRAINT "user_dictionary_cards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_settings" (
    "user_id" TEXT NOT NULL,
    "setting_key" TEXT NOT NULL,
    "value" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "server_revision" BIGINT NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id","setting_key")
);

CREATE TABLE "sync_applied_operations" (
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "operation_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result_kind" TEXT NOT NULL,
    "result_payload" JSONB NOT NULL,

    CONSTRAINT "sync_applied_operations_pkey" PRIMARY KEY ("user_id","device_id","operation_id")
);

CREATE TABLE "sync_change_log" (
    "cursor" BIGINT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_change_log_pkey" PRIMARY KEY ("cursor")
);

CREATE INDEX "user_dictionary_cards_user_id_normalized_card_idx" ON "user_dictionary_cards"("user_id", "normalized_card");
CREATE INDEX "user_dictionary_cards_user_id_deleted_at_idx" ON "user_dictionary_cards"("user_id", "deleted_at");
CREATE INDEX "user_dictionary_cards_user_id_server_revision_idx" ON "user_dictionary_cards"("user_id", "server_revision");
CREATE UNIQUE INDEX "user_dictionary_cards_active_normalized_card_unique" ON "user_dictionary_cards"("user_id", "normalized_card") WHERE "deleted_at" IS NULL;

CREATE INDEX "user_settings_user_id_server_revision_idx" ON "user_settings"("user_id", "server_revision");

CREATE INDEX "sync_applied_operations_user_id_device_id_applied_at_idx" ON "sync_applied_operations"("user_id", "device_id", "applied_at");

CREATE INDEX "sync_change_log_user_id_cursor_idx" ON "sync_change_log"("user_id", "cursor");

ALTER TABLE "user_dictionary_cards"
ADD CONSTRAINT "user_dictionary_cards_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_settings"
ADD CONSTRAINT "user_settings_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sync_applied_operations"
ADD CONSTRAINT "sync_applied_operations_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sync_change_log"
ADD CONSTRAINT "sync_change_log_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
