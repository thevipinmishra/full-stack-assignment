FROM node:24-alpine AS build

WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter @lead-intake/api...

COPY apps/api apps/api
RUN pnpm --filter @lead-intake/api build
RUN pnpm --filter @lead-intake/api deploy --prod /app

FROM node:24-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app ./
COPY --from=build /workspace/apps/api/dist ./dist
COPY --from=build /workspace/apps/api/drizzle ./drizzle

EXPOSE 3001
CMD ["node", "dist/server.js"]
