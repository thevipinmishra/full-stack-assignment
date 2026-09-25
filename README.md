# Lead intake service

A full-stack lead intake service with a signed webhook emulator, lead audit history, and a React management view. The demo uses synthetic leads and needs no Meta account.

Live demo: https://web-production-06898.up.railway.app/ (API health: https://web-production-06898.up.railway.app/api/health)

## Stack

- React 19 and TypeScript
- Vite
- TanStack Router and TanStack Query
- TanStack Table v9, Base UI, and Reicon
- Tailwind CSS
- Fastify 5 with TypeBox
- Drizzle ORM and PostgreSQL
- pnpm workspaces
- Vitest

## Repository structure

```text
apps/
  api/    Fastify API
  web/    React application
```

## Requirements

- Node.js 24 or newer
- Corepack enabled, or pnpm 11.25.0 installed

## Local setup

```bash
pnpm install
docker compose up database -d
pnpm --filter @lead-intake/api db:migrate
pnpm dev
```

The web application runs at `http://localhost:3000`, and the Fastify API runs at `http://localhost:3001` in development.

The lead list at `/` supports live search, multiple campaign and status filters, sorting, page size, column visibility, and pagination. Filtering, sorting, and pagination run across the full result set in PostgreSQL. Select a lead to see its details and activity timeline or change its status. The web app sends `/api/leads` requests through Vite's development proxy to the API on port 3001. In production, Nginx proxies `/api/*` to the API on the same origin.

Use `apps/api/.env.example` as the environment variable reference. Export the values through your shell or pass them through your process manager. The service uses a local PostgreSQL URL when `DATABASE_URL` is absent. Node does not load `.env` files by itself.

## Backend API

| Method  | Path                 | Purpose                                    |
| ------- | -------------------- | ------------------------------------------ |
| `GET`   | `/health`            | Check the API and database connection      |
| `GET`   | `/webhook/meta-lead` | Answer a configured Meta subscription challenge |
| `POST`  | `/webhook/meta-lead` | Store or update simulated Meta leads       |
| `POST`  | `/demo/webhook`      | Send one signed synthetic webhook          |
| `GET`   | `/leads`             | List and filter leads                      |
| `GET`   | `/leads/campaigns`   | List campaign names for filters            |
| `GET`   | `/leads/:id`         | Return one lead with its activity timeline |
| `PATCH` | `/leads/:id/status`  | Change a lead's status                     |

`GET /leads` accepts `page`, `limit`, `status`, `search`, `campaign`, `sortBy`, and `sortDirection`. Repeat `campaign` or `status` to select more than one value. Campaigns match exact names; statuses and campaigns each match any selected value. Search treats `%` and `_` as literal characters. Sort fields are `createdAt`, `fullName`, `campaignName`, and `status`; direction is `asc` or `desc`. Valid statuses are `new`, `contacted`, `qualified`, `disqualified`, and `converted`.

The sample button sends one Meta-shaped page event with synthetic contact and campaign details. The command-line simulator below sends a notification and then enriches it for the same `leadgen_id`. Both are webhook simulations, not a live Meta integration.

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

Set `WEBHOOK_SIGNING_SECRET` to verify `X-Hub-Signature-256`, an HMAC-SHA256 digest of the raw JSON body. The API requires this secret when `NODE_ENV=production`. Docker Compose uses `local-demo-secret` for local use. Use the actual Meta app secret for a Meta subscription; the simulator must use the same value as the API. Set `META_VERIFY_TOKEN` to enable the `GET /webhook/meta-lead` subscription challenge. The configured token must match the token entered in Meta's app settings. Without it, the challenge returns 403.

## Synthetic end-to-end demo

On the deployed app, select **Send sample webhook** beside the page title. The API signs and submits one Meta-shaped event with a random name, synthetic `example.com` email, fictional phone number, campaign, ad, form, and page details. A toast links to the new lead and its webhook activity record. The button uses one delivery so the lead is ready to inspect as soon as it returns.

The button uses the signing secret on the API server. The browser never receives it. To use the button in local development, set `WEBHOOK_SIGNING_SECRET` for the API process or run the Docker Compose stack, which provides `local-demo-secret`.

With the API and database running, run:

```bash
node scripts/demo-lead.mjs http://localhost:3001
```

The local script uses Docker Compose's demo secret by default. For a public deployment, set `WEBHOOK_SIGNING_SECRET` in the script's environment and run:

```bash
node scripts/demo-lead.mjs https://YOUR-WEB-DOMAIN/api
```

The script sends a signed `page`/`leadgen` notification, an enriched synthetic delivery, and an identical retry. It changes the status to `contacted` and checks for one `lead_created`, one `lead_updated`, and one `status_changed` activity. Each run uses a new `demo-...` identifier and an `example.com` email address. The script exits with an error if any check fails.

## Checks

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Docker

Start PostgreSQL, the API, and the web app with:

```bash
docker compose up --build
```

The API container applies pending migrations before it starts. PostgreSQL data is stored in the `lead-intake-data` volume. The web app is available at `http://localhost:3000`; its Nginx container proxies `/api/*` to the API container. Docker Compose is for local use.

## Architecture and decisions

The simulator sends signed requests to Fastify. PostgreSQL stores the current lead in `leads` and each state-changing action in `lead_activities`. Ingestion uses a unique Meta lead ID and a transaction so a retry cannot create a duplicate lead. The activity row and lead change commit together. A repeated payload that changes no stored field creates no new activity.

TanStack Table manages the table state and rendering. Fastify applies search, campaign and status filters, allowlisted sorting, and pagination to PostgreSQL. Database indexes cover the unique lead ID, creation order, and status plus creation order. Search uses `ILIKE`; a trigram index would help at larger scale.

## Trade-offs

The command-line simulator's initial notification stores only IDs and timestamps. Its second request supplies contact answers through `field_data`. The API supports Meta's subscription challenge and signature header, but a real integration still needs a Graph API fetch for contact answers, access token management, and retries for failed enrichment.

The public demo also has no login for lead reads or status changes. Use synthetic data only until authentication, authorization, and retention rules are in place.

## Railway deployment

Railway runs each container as a separate service; it does not execute `compose.yaml` as a single production stack. Create one Railway project with a PostgreSQL service, an `api` service, and a `web` service. Connect both application services to this repository with the repository root as their build context.

1. Set the API service's Dockerfile path (`RAILWAY_DOCKERFILE_PATH`) to `apps/api/Dockerfile`. Set `DATABASE_URL` to `${{Postgres.DATABASE_URL}}`, `PORT` to `3001`, and a strong `WEBHOOK_SIGNING_SECRET`. Set `META_VERIFY_TOKEN` as well if connecting a Meta app. Set its pre-deploy command to `node dist/db/migrate.js` and health check path to `/health`. The API only needs its automatic private domain when the web proxy receives all external requests.
2. Set the web service's Dockerfile path (`RAILWAY_DOCKERFILE_PATH`) to `apps/web/Dockerfile`. Set `PORT=8080`, `API_HOST=api.railway.internal`, and `API_PORT=3001`. Give this service a public domain. Browser requests and synthetic webhook requests use this domain; `/api/*` goes to the private API service.
3. Run the simulator against `https://YOUR-WEB-DOMAIN/api`, with `WEBHOOK_SIGNING_SECRET` in the script's environment. Confirm the lead list, detail page, status change, timeline, and `/api/health` on the public domain. Put the verified public web URL in the submission.

The public webhook URL is `https://YOUR-WEB-DOMAIN/api/webhook/meta-lead`. Keep the signing secret outside the repository and frontend build.

## Scaling considerations

The API is stateless, so additional replicas can share PostgreSQL. Webhook ingestion currently handles each request in one database transaction. At higher volume, accept a verified notification into a durable queue, acknowledge it quickly, and process enrichment and retries in a worker. Add metrics for webhook failures, processing time, and leads missing contact data.

## Future improvements

Before storing real contact data, add authentication and authorization to lead reads and status changes, restrict access to the activity timeline, and define retention rules. Use a dedicated test database for transaction tests covering concurrent deliveries and audit consistency. The synthetic demo is an executable smoke test, not a substitute for those tests.

## References

- [Meta's lead ads webhook sample](https://github.com/fbsamples/lead-ads-webhook-sample)
- [Railway Dockerfile configuration](https://docs.railway.com/builds/dockerfiles)
- [Railway private networking](https://docs.railway.com/networking/private-networking)
- [Railway pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command)
