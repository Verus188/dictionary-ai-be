# Frontend Sync Integration Guide

This document describes the sync backend that is already implemented in this repository.

It is intended to be fed to an AI agent that will connect the frontend to the backend sync API.

Use this document as the source of truth for frontend integration.

---

## Goal

Connect the frontend local SQLite data layer to the backend sync API for:

1. Dictionary cards
2. Persisted story settings

Do not sync generated story text or in-progress story session state in V1.

The app must remain local-first:

- UI reads from local SQLite
- local writes succeed immediately
- sync runs in background / best-effort
- frontend must converge using `push` + `pull`

---

## Backend Endpoints

All sync endpoints require auth.

Use:

```http
Authorization: Bearer <access_token>
```

Backend derives the user from the JWT.

Never send `userId` in sync requests.

### Push

```http
POST /sync/push
Content-Type: application/json
Authorization: Bearer <access_token>
```

### Pull

```http
GET /sync/pull?cursor=<lastCursor>&limit=200
Authorization: Bearer <access_token>
```

`limit` is optional, max `200`.

If the client has never synced before, use:

```http
GET /sync/pull
```

or:

```http
GET /sync/pull?cursor=0
```

---

## Synced Entities

## 1. Dictionary Card

Logical frontend shape:

```ts
type DictionaryCard = {
  id: string;
  card: string;
  updatedAt?: string;
  deletedAt?: string | null;
};
```

Important backend behavior:

- `id` must be generated on the client and stay stable
- backend normalizes card text to `trim -> collapse spaces -> lowercase`
- backend stores one active card per normalized value for the same user
- deletes are soft deletes via tombstones

### Practical rule for frontend

If the user creates `"  Betrayal  "` locally, the synced server state will come back as:

```json
{
  "id": "...",
  "card": "betrayal"
}
```

Frontend must accept server-normalized `card` and update local SQLite with it after pull.

## 2. Story Setting

Supported keys:

```ts
type SettingKey =
  | 'storyContinuationLength'
  | 'educationLanguage'
  | 'storyLanguageDifficulty';
```

Logical frontend shape:

```ts
type StorySetting = {
  key: SettingKey;
  value: unknown | null;
  updatedAt?: string;
  deletedAt?: string | null;
};
```

Backend stores one row per `(user, key)`.

`value` is JSON-compatible and may be `null`.

---

## Push Request Contract

Request shape:

```ts
type PushSyncRequest = {
  deviceId: string;
  operations: SyncOperation[];
};
```

Operation shape:

```ts
type SyncEntityType = 'dictionaryCard' | 'setting';
type SyncOperationType = 'upsert' | 'delete';

type SyncOperation = {
  operationId: string;
  entityType: SyncEntityType;
  operationType: SyncOperationType;
  entityId: string;
  clientUpdatedAt: string; // ISO string
  payload: unknown | null;
};
```

### Dictionary Card Upsert

```json
{
  "operationId": "op-uuid",
  "entityType": "dictionaryCard",
  "operationType": "upsert",
  "entityId": "card-uuid",
  "clientUpdatedAt": "2026-04-15T10:00:00.000Z",
  "payload": {
    "id": "card-uuid",
    "card": "betrayal"
  }
}
```

Rules:

- `payload` must be an object
- `payload.id` must equal `entityId`
- `payload.card` must be a non-empty string

### Dictionary Card Delete

```json
{
  "operationId": "op-uuid",
  "entityType": "dictionaryCard",
  "operationType": "delete",
  "entityId": "card-uuid",
  "clientUpdatedAt": "2026-04-15T10:05:00.000Z",
  "payload": null
}
```

### Setting Upsert

```json
{
  "operationId": "op-uuid",
  "entityType": "setting",
  "operationType": "upsert",
  "entityId": "educationLanguage",
  "clientUpdatedAt": "2026-04-15T10:07:00.000Z",
  "payload": {
    "key": "educationLanguage",
    "value": "English"
  }
}
```

Rules:

- `payload` must be an object
- `payload.key` must equal `entityId`
- `entityId` must be one of the supported setting keys
- `value` may be `null`

### Setting Delete

Backend supports delete for settings too:

```json
{
  "operationId": "op-uuid",
  "entityType": "setting",
  "operationType": "delete",
  "entityId": "educationLanguage",
  "clientUpdatedAt": "2026-04-15T10:08:00.000Z",
  "payload": null
}
```

If frontend does not need setting deletion yet, it can simply avoid sending such operations.

---

## Push Response Contract

```ts
type PushSyncResult = {
  operationId: string;
  status: 'applied' | 'noop' | 'ignored';
  entityType: 'dictionaryCard' | 'setting';
  entityId: string;
  serverRevision?: number;
};

type DictionaryCardSyncEntity = {
  id: string;
  card: string;
  updatedAt: string;
  deletedAt: string | null;
  serverRevision: number;
};

type PushSyncConflict = {
  operationId: string;
  type: 'dictionary_duplicate_merged';
  entityType: 'dictionaryCard';
  submittedEntityId: string;
  canonicalEntity: DictionaryCardSyncEntity;
};

type PushSyncResponse = {
  results: PushSyncResult[];
  conflicts: PushSyncConflict[];
};
```

### Result status semantics

`applied`

- the server changed state
- operation can be removed from local outbox

`noop`

- nothing changed on server
- treat as successful sync
- operation can be removed from local outbox

`ignored`

- currently used for old card create/upsert that arrived after that card id had already been deleted on the server
- do not retry forever
- operation can be removed from local outbox
- frontend should wait for pull to converge local state

### Conflict semantics

Currently the only structured conflict is:

`dictionary_duplicate_merged`

Meaning:

- this device tried to create a new card
- another active card with the same normalized text already exists for this user
- backend kept the canonical existing card
- frontend must merge local duplicate into `canonicalEntity`

Recommended frontend handling:

1. Remove the pending operation from outbox.
2. Replace local duplicate card with the canonical server card.
3. If the duplicate local record still exists separately in SQLite, delete it locally.
4. Keep using the canonical `id` from `canonicalEntity.id`.

Do not keep retrying the conflicted duplicate create.

---

## Pull Response Contract

```ts
type SettingSyncEntity = {
  key: 'storyContinuationLength' | 'educationLanguage' | 'storyLanguageDifficulty';
  value: unknown | null;
  updatedAt: string;
  deletedAt: string | null;
  serverRevision: number;
};

type PullSyncChange = {
  cursor: number;
  entityType: 'dictionaryCard' | 'setting';
  changeType: 'upsert' | 'delete';
  entity: DictionaryCardSyncEntity | SettingSyncEntity;
};

type PullSyncResponse = {
  cursor: number;
  hasMore: boolean;
  changes: PullSyncChange[];
};
```

Example:

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
        "updatedAt": "2026-04-15T10:08:00.000Z",
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
        "card": "obsolete",
        "updatedAt": "2026-04-15T10:09:00.000Z",
        "deletedAt": "2026-04-15T10:09:00.000Z",
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
        "updatedAt": "2026-04-15T10:10:00.000Z",
        "deletedAt": null,
        "serverRevision": 106
      }
    }
  ]
}
```

### Pull semantics

- changes are ordered by `cursor` ascending
- pull returns only current authenticated user data
- deletes are included as tombstones
- client must keep pulling while `hasMore === true`
- after processing a page, store the returned top-level `cursor`

---

## Required Frontend Local State

Frontend should keep at least:

## 1. Main local tables

- dictionary cards
- persisted story settings

These are the tables used by UI directly.

## 2. Sync metadata

- `lastSyncCursor`
- stable `deviceId`

`deviceId` must stay stable across app restarts and installs if possible.

## 3. Local outbox

Recommended shape:

```ts
type PendingSyncOperation = {
  operationId: string;
  deviceId: string;
  entityType: 'dictionaryCard' | 'setting';
  operationType: 'upsert' | 'delete';
  entityId: string;
  clientUpdatedAt: string;
  payload: unknown | null;
  createdAt: string;
};
```

Important:

- store operations in insertion order
- preserve order when sending `POST /sync/push`
- do not mutate old `operationId`
- retries must resend the exact same operation data

---

## Recommended Frontend Sync Flow

Use this flow:

1. User changes local SQLite immediately.
2. Frontend creates an outbox operation.
3. Sync worker sends a batch to `POST /sync/push`.
4. Frontend processes `results` and `conflicts`.
5. Frontend calls `GET /sync/pull`.
6. Frontend applies remote changes to local SQLite.
7. Frontend stores the new cursor.
8. If `hasMore === true`, frontend repeats pull.

The UI should never depend on push response alone.

Push response only helps settle local pending operations.

The real source for convergence is:

1. local SQLite
2. push settlement
3. pull replay

---

## How To Apply Pull Changes Locally

### Dictionary card `upsert`

When receiving:

```json
{
  "entityType": "dictionaryCard",
  "changeType": "upsert"
}
```

Apply:

- insert if missing
- update if existing
- set local `card` to server value
- set `updatedAt`
- set `deletedAt = null`
- keep the same `id`

### Dictionary card `delete`

When receiving:

```json
{
  "entityType": "dictionaryCard",
  "changeType": "delete"
}
```

Apply:

- mark local row as deleted or remove it from active queries
- preserve tombstone semantics if local DB supports it
- set local `deletedAt` from server

### Setting `upsert`

Apply:

- upsert local setting by key
- set local value to server value
- set `updatedAt`
- set `deletedAt = null`

### Setting `delete`

Apply:

- mark deleted or remove locally
- set `deletedAt`

---

## Important Conflict / Convergence Rules

## 1. Duplicate cards across devices

If two devices create `"betrayal"` offline with different ids:

- backend keeps one canonical active card
- one push may return `dictionary_duplicate_merged`
- later pull will converge all devices to the canonical card set

Frontend must not preserve both active duplicates forever.

## 2. Delete replay

Deleting an already deleted card or setting is treated as success/no-op.

Frontend can safely remove that operation from the outbox.

## 3. Retried pushes

Backend is idempotent by:

```ts
(userId, deviceId, operationId)
```

So if a request times out, frontend may retry the exact same batch safely.

## 4. Old upsert after newer delete for same card id

Backend will not silently resurrect the deleted card.

Current behavior:

- server returns `ignored`
- frontend should stop retrying that operation
- next pull should bring the correct deleted state

---

## Frontend Implementation Notes

## Generate IDs

Frontend must generate:

- `deviceId`: stable UUID
- `operationId`: UUID per outbox operation
- `card.id`: UUID per card

## Batch strategy

Safe initial strategy:

- push a small batch, for example `20-100` operations
- then pull until `hasMore === false`

## Ordering

Push operations must be sent in the same order they were created locally.

Do not reorder outbox items before push.

## Retry

Retry on:

- network failure
- timeout
- temporary 5xx

Do not retry forever when the server already responded with:

- `applied`
- `noop`
- `ignored`
- `dictionary_duplicate_merged`

## Auth failure

If sync gets `401` / `403`:

- stop sync
- refresh/re-login using the app auth flow
- do not drop local data
- keep outbox for later retry

---

## Suggested Frontend Types

```ts
export type SyncEntityType = 'dictionaryCard' | 'setting';
export type SyncOperationType = 'upsert' | 'delete';

export type SettingKey =
  | 'storyContinuationLength'
  | 'educationLanguage'
  | 'storyLanguageDifficulty';

export type PushSyncResult = {
  operationId: string;
  status: 'applied' | 'noop' | 'ignored';
  entityType: SyncEntityType;
  entityId: string;
  serverRevision?: number;
};

export type DictionaryCardSyncEntity = {
  id: string;
  card: string;
  updatedAt: string;
  deletedAt: string | null;
  serverRevision: number;
};

export type SettingSyncEntity = {
  key: SettingKey;
  value: unknown | null;
  updatedAt: string;
  deletedAt: string | null;
  serverRevision: number;
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
  changeType: SyncOperationType;
  entity: DictionaryCardSyncEntity | SettingSyncEntity;
};

export type PullSyncResponse = {
  cursor: number;
  hasMore: boolean;
  changes: PullSyncChange[];
};
```

---

## Minimal Integration Checklist

The frontend AI agent should implement all of the following:

1. Stable `deviceId` storage.
2. Local outbox storage in SQLite.
3. Outbox insertion on local card create/delete.
4. Outbox insertion on local setting change.
5. `POST /sync/push` API client.
6. `GET /sync/pull` API client.
7. Push result settlement for `applied`, `noop`, `ignored`.
8. Conflict settlement for `dictionary_duplicate_merged`.
9. Pull application into local SQLite.
10. Cursor persistence.
11. Retry-safe sync worker.
12. Sync that does not block local offline usage.

---

## Important Backend Facts To Respect

- Backend is not the only source of truth at write time.
- Client is local-first.
- Sync is asynchronous.
- Sync is authenticated.
- Push is idempotent.
- Pull is incremental by cursor.
- Deletes are tombstones.
- Dictionary cards are canonicalized by normalized lowercase text per user.

If the frontend implementation respects those rules, it should converge correctly across multiple devices.
