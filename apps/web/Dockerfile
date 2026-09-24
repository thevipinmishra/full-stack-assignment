FROM node:24-alpine AS build

WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @lead-intake/web...

COPY apps/web apps/web
RUN pnpm --filter @lead-intake/web build

FROM nginx:alpine

COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY apps/web/15-resolver.envsh /docker-entrypoint.d/15-resolver.envsh
RUN chmod +x /docker-entrypoint.d/15-resolver.envsh
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html

ENV PORT=8080 API_HOST=api API_PORT=3001
EXPOSE 8080
