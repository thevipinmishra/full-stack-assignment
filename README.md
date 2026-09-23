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
pnpm dev
```

The web application runs at `http://localhost:3000`, and the Fastify API runs at `http://localhost:3001` in development.
