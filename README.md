# Dictionary AI Backend

Backend for an offline-first dictionary app built with NestJS, Prisma, PostgreSQL, and AI integrations.

## Local setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy env values if needed:

```bash
cp .env.example .env
```

3. Start PostgreSQL and Adminer in Docker:

```bash
pnpm db:up
```

4. Apply Prisma migrations:

```bash
pnpm prisma:migrate
```

5. Start the backend:

```bash
pnpm dev
```

## Local database

The project includes a local PostgreSQL service in [compose.yaml](/Users/nikita/Desktop/projects/dictionary-ai-be/compose.yaml).

- Host: `localhost`
- Port: `5432`
- Database: `dictionary_ai_be`
- User: `postgres`
- Password: `postgres`

Admin UI:

- URL: `http://localhost:8080`
- System: `PostgreSQL`
- Server: `postgres`
- Username: `postgres`
- Password: `postgres`
- Database: `dictionary_ai_be`

Useful commands:

```bash
pnpm db:up
pnpm db:logs
pnpm db:down
```

## Prisma

Generate client:

```bash
pnpm prisma:generate
```

Run migrations:

```bash
pnpm prisma:migrate
```

Push schema without a migration:

```bash
pnpm prisma:push
```

## Tests

```bash
pnpm test
pnpm test:e2e
```
