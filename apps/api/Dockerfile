# PitchKH API image. Build from the repo root:
#   docker build -f apps/api/Dockerfile -t pitchkh-api .
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter "@pitchkh/api..."
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @pitchkh/api build
# Production dependencies only, in a self-contained folder.
RUN pnpm --filter @pitchkh/api deploy --prod --legacy /out && cp -r apps/api/dist /out/dist

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out /app
USER node
EXPOSE 8000
# Apply pending migrations, then serve. Both are safe to run on every start.
CMD ["sh", "-c", "node dist/migrate.js && node dist/main.js"]
