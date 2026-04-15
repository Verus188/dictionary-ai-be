# Backend Sync Instructions

## Goal

Build backend synchronization for a local-first mobile app.

The app already has:
- authentication with `user.id`
- a per-user local SQLite database on the client
- local dictionary cards
- local persisted story settings

The app must remain usable offline. Local writes must succeed immediately and sync later.

## Scope Of V1

Sync only these user-scoped entities:

1. Dictionary cards
2. Persisted story settings

Do not sync generated story text or in-progress story session state in V1.

## Product Rules

1. Client is local-first.
2. UI reads from local SQLite, not from sync responses directly.
3. Sync is asynchronous and best-effort.
4. Sync must be idempotent.
5. Sync must support multiple devices for the same user.
6. Deletions must sync correctly.
7. The same user may edit data offline on two devices and later reconnect.

## Entity Model

### Dictionary Card

Logical shape:

```ts
type DictionaryCard = {
  id: string; // client-generated UUID, stable across sync
  card: string; // normalized lowercase word/phrase
};
```

Server model requirements:
- `id`
- `user_id`
- `card`
- `normalized_card`
- `created_at`
- `updated_at`
- `deleted_at nullable`
- `server_revision bigint`

Rules:
- enforce uniqueness for active cards by `(user_id, normalized_card)`
- keep tombstones for deleted rows so deletes can be pulled by other devices

### Story Setting

Logical shape:

```ts
type SettingKey =
  | 'storyContinuationLength'
  | 'educationLanguage'
  | 'storyLanguageDifficulty';
```

Server model requirements:
- `user_id`
- `setting_key`
- `value nullable`
- `updated_at`
- `deleted_at nullable` if you want delete support later
- `server_revision bigint`

Use unique key `(user_id, setting_key)`.

## Required Sync Architecture

Implement cursor-based incremental sync.

Recommended backend tables:

1. Domain tables
   - `user_dictionary_cards`
   - `user_settings`

2. Sync infrastructure
   - `sync_applied_operations`
   - `sync_change_log`

### `sync_applied_operations`

Purpose:
- idempotency for push requests
- prevent double-applying retries

Suggested fields:
- `user_id`
- `device_id`
- `operation_id`
- `entity_type`
- `entity_id`
- `applied_at`
- unique index on `(user_id, device_id, operation_id)`

### `sync_change_log`

Purpose:
- pull all changes since cursor
- include creates, updates, deletes

Suggested fields:
- `cursor bigint generated in increasing order`
- `user_id`
- `entity_type`
- `entity_id`
- `change_type`
- `payload jsonb`
- `created_at`

Every successful mutation that changes server state must append one row to `sync_change_log`.

## API Contract

Implement two endpoints.

### 1. Push local mutations

`POST /sync/push`

Request:

```json
{
  "deviceId": "device-uuid",
  "operations": [
    {
      "operationId": "op-uuid",
      "entityType": "dictionaryCard",
      "operationType": "upsert",
      "entityId": "card-uuid",
      "clientUpdatedAt": "2026-04-13T10:00:00.000Z",
      "payload": {
        "id": "card-uuid",
        "card": "betrayal"
      }
    },
    {
      "operationId": "op-uuid-2",
      "entityType": "dictionaryCard",
      "operationType": "delete",
      "entityId": "card-uuid",
      "clientUpdatedAt": "2026-04-13T10:05:00.000Z",
      "payload": null
    },
    {
      "operationId": "op-uuid-3",
      "entityType": "setting",
      "operationType": "upsert",
      "entityId": "educationLanguage",
      "clientUpdatedAt": "2026-04-13T10:07:00.000Z",
      "payload": {
        "key": "educationLanguage",
        "value": "English"
      }
    }
  ]
}
```

Response:

```json
{
  "results": [
    {
      "operationId": "op-uuid",
      "status": "applied",
      "entityType": "dictionaryCard",
      "entityId": "card-uuid",
      "serverRevision": 101
    }
  ],
  "conflicts": [
    {
      "operationId": "op-uuid-x",
      "type": "dictionary_duplicate_merged",
      "entityType": "dictionaryCard",
      "submittedEntityId": "temp-card-id",
      "canonicalEntity": {
        "id": "real-card-id",
        "card": "betrayal",
        "updatedAt": "2026-04-13T10:08:00.000Z",
        "deletedAt": null,
        "serverRevision": 104
      }
    }
  ]
}
```

Requirements:
- apply operations in request order
- be idempotent by `(user_id, device_id, operation_id)`
- return enough data so frontend can mark local operations as synced
- return structured conflict info, not only plain strings

### 2. Pull remote changes

`GET /sync/pull?cursor=<lastCursor>&limit=200`

Response:

```json
{
  "cursor": 140,
  "hasMore": false,
  "changes": [
    {
      "cursor": 132,
      "entityType": "dictionaryCard",
      "changeType": "upsert",
      "entity": {
        "id": "card-uuid",
        "card": "betrayal",
        "updatedAt": "2026-04-13T10:08:00.000Z",
        "deletedAt": null,
        "serverRevision": 104
      }
    },
    {
      "cursor": 133,
      "entityType": "dictionaryCard",
      "changeType": "delete",
      "entity": {
        "id": "card-uuid-2",
        "updatedAt": "2026-04-13T10:09:00.000Z",
        "deletedAt": "2026-04-13T10:09:00.000Z",
        "serverRevision": 105
      }
    },
    {
      "cursor": 134,
      "entityType": "setting",
      "changeType": "upsert",
      "entity": {
        "key": "educationLanguage",
        "value": "Spanish",
        "updatedAt": "2026-04-13T10:10:00.000Z",
        "serverRevision": 106
      }
    }
  ]
}
```

Requirements:
- return only current user data
- order changes by cursor ascending
- include deletes as tombstones
- support pagination via `limit`

## Conflict Resolution

Use explicit deterministic rules.

### 1. Settings

Conflict rule for V1:
- last server-accepted write wins per key

Rationale:
- settings are simple preferences
- user does not need manual merge UI in V1

Meaning:
- if device A sets `educationLanguage=English`
- and device B later syncs `educationLanguage=Spanish`
- the server stores `Spanish`
- other devices receive `Spanish` on next pull

Do not attempt field-level merge inside a single setting key.

### 2. Dictionary Cards

Supported local operations in V1:
- create
- delete

Conflict rules:

1. Same card text added on two devices
   - compare by `normalized_card`
   - keep one canonical active card per `(user_id, normalized_card)`
   - return a structured conflict `dictionary_duplicate_merged`
   - client must replace duplicate local entity with the canonical one

2. Delete for already deleted card
   - treat as success/no-op

3. Replayed create with same `id`
   - treat as idempotent success

4. Old create arrives after a newer delete for same `id`
   - keep deleted state
   - do not resurrect silently

5. Pull after duplicate merge
   - pull must eventually converge all devices to the same canonical card set

Important:
- dictionary sync must converge to one active row per normalized card for the user

## Server Timestamp And Revision Rules

Use server-assigned timestamps and monotonic revisions as the source of truth.

Requirements:
- every accepted mutation gets a new `server_revision`
- `updated_at` is assigned by the server
- client timestamps are advisory only

Why:
- device clocks are unreliable
- server revision gives deterministic ordering

## Sync Semantics

Expected client flow:

1. Client writes locally first.
2. Client stores pending operations in local outbox.
3. Client calls `POST /sync/push`.
4. Client calls `GET /sync/pull?cursor=...`.
5. Client updates local DB from pull response.
6. Client stores latest cursor.

Backend must be compatible with this flow.

## Authentication

All sync endpoints must require authentication.

Rules:
- derive `user_id` from access token
- never trust `userId` from request body
- device identifiers are only for idempotency and diagnostics

## Non-Goals For V1

Do not implement:
- sync for generated story sessions
- WebSocket live sync
- manual user-facing conflict resolution UI
- CRDTs
- cross-user shared dictionaries

## Acceptance Criteria

Backend is acceptable only if all of the following are true:

1. A user can add cards offline on device A and later sync them.
2. A user can change settings offline on device A and later sync them.
3. Device B can pull those changes and converge to the same state.
4. Deletions propagate correctly.
5. Retried push requests do not duplicate writes.
6. Concurrent duplicate dictionary cards converge to one canonical active row.
7. Sync endpoints never leak another user's data.
8. Pull supports incremental sync by cursor.

## Suggested Implementation Order

1. Create domain tables with revisions and tombstones.
2. Create idempotency table for applied operations.
3. Create change-log table and cursor generation.
4. Implement `POST /sync/push`.
5. Implement `GET /sync/pull`.
6. Write tests for duplicate add, delete replay, retry idempotency, and multi-device convergence.
