# Fastify + TypeScript API

A small REST API starter built with Fastify 5 and TypeScript.

## Requirements

- Node.js 20 or newer
- pnpm
- Docker (for local PostgreSQL)

## Setup

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
```

## Development

```bash
pnpm dev
```

The API runs at `http://localhost:3000` by default.

## Production

```bash
pnpm typecheck
pnpm build
pnpm start
```

## Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| GET | `/api/users` | List users |
| GET | `/api/users/:id` | Get a user |
| POST | `/api/users` | Create a user |
| DELETE | `/api/users/:id` | Delete a user |

### Create a user

```bash
curl -X POST http://localhost:3000/api/users \
  -H 'content-type: application/json' \
  -d '{"name":"Pouya","email":"pouya@example.com"}'
```

> Users are stored in PostgreSQL via Prisma (`User` model in `prisma/schema.prisma`).
