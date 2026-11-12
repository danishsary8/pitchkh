# apps/api (placeholder)

The backend (Laravel or Flask + PostgreSQL) will live here. It is **not built yet**.

Build it from these documents, which are the source of truth:

- `docs/API_CONTRACT.md` — every endpoint (method, path, request, response, errors, roles)
- `docs/DATA_MODEL.md` — entities, relations, suggested PostgreSQL tables and indexes
- `packages/shared/src/schemas` — zod schemas with the exact JSON shapes

When the API is running, set `NEXT_PUBLIC_API_MODE=real` and `NEXT_PUBLIC_API_URL=<url>` in `apps/web`.
