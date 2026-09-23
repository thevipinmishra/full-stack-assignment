# Lead intake service

A full-stack service for receiving Meta lead webhooks, storing leads and their audit history, and managing lead status from a React application.

## Stack

- React 19 and TypeScript
- Vite
- TanStack Router and TanStack Query
- Tailwind CSS
- Fastify 5 with TypeBox
- Drizzle ORM and PostgreSQL
- pnpm workspaces

## Repository structure

```text
apps/
  api/    Fastify API
  web/    React application
```

## Requirements

- Node.js 24 or newer
- Corepack enabled, or pnpm 12.5.1 installed

## Local setup

```bash
pnpm install
docker compose up database -d
pnpm --filter @lead-intake/api db:migrate
pnpm dev
```

The web application runs at `http://localhost:3000`, and the Fastify API runs at `http://localhost:3001` in development.

Use `apps/api/.env.example` as the environment variable reference. Export the values through your shell or pass them through your process manager. The service uses a local PostgreSQL URL when `DATABASE_URL` is absent. Node does not load `.env` files by itself.

## Backend API

| Method  | Path                 | Purpose                                    |
| ------- | -------------------- | ------------------------------------------ |
| `GET`   | `/health`            | Check the API and database connection      |
| `GET`   | `/webhook/meta-lead` | Complete Meta webhook verification         |
| `POST`  | `/webhook/meta-lead` | Store or update Meta leads                 |
| `GET`   | `/leads`             | List and filter leads                      |
| `GET`   | `/leads/:id`         | Return one lead with its activity timeline |
| `PATCH` | `/leads/:id/status`  | Change a lead's status                     |

`GET /leads` accepts `page`, `limit`, `status`, and `search`. Valid statuses are `new`, `contacted`, `qualified`, `disqualified`, and `converted`.

The webhook accepts a Meta page event or a single enriched payload. A page event can arrive before contact details are available:

```json
{
  "object": "page",
  "entry": [
    {
      "id": "page-123",
      "changes": [
        {
          "field": "leadgen",
          "value": {
            "leadgen_id": "lead-123",
            "form_id": "form-123",
            "ad_id": "ad-123",
            "created_time": 1789990000
          }
        }
      ]
    }
  ]
}
```

An enriched delivery with the same `leadgen_id` updates only the supplied fields:

```json
{
  "leadgen_id": "lead-123",
  "campaign_name": "September campaign",
  "field_data": [
    { "name": "full_name", "values": ["Avery Stone"] },
    { "name": "email", "values": ["avery@example.com"] },
    { "name": "phone_number", "values": ["+15551234567"] }
  ]
}
```

Webhook retries are idempotent. The first delivery creates a `lead_created` activity. A later delivery that changes stored fields creates `lead_updated`. An identical retry creates no duplicate activity. Status changes create `status_changed` in the same transaction as the lead update.

Set `META_APP_SECRET` to enforce `X-Hub-Signature-256` validation. Set `META_VERIFY_TOKEN` to enable Meta's webhook verification handshake. Both can remain unset for local development.

## Docker

Start PostgreSQL and the API with:

```bash
docker compose up --build
```

The API container applies pending migrations before it starts. PostgreSQL data is stored in the `lead-intake-data` volume.
