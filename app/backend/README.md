# Backend — Deployment Guide

## Overview

This is a **REST API** built with Node.js (NestJS framework) backed by a **PostgreSQL** database via an ORM. It exposes HTTP endpoints consumed by the frontend and handles all data persistence.

---

## Runtime

- **Node.js** 22+
- **Package manager:** pnpm

---

## Building and running locally

```bash
# Install dependencies
pnpm install

# Generate ORM client (required before build)
pnpm db:generate

# Build the application
pnpm build

# Run in production mode
node dist/main
```

For development with hot-reload:

```bash
pnpm start:dev
```

---

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string. Format: `postgresql://USER:PASSWORD@HOST:PORT/DB_NAME` |
| `PORT` | No | `3001` | Port the server listens on |
| `NODE_ENV` | No | — | Set to `production` for production deployments |

---

## Exposed port

**3001** (default, overridable via `PORT`)

---

## Health check

```text
GET /health
```

Returns API and database connectivity status. Suitable for container/infrastructure health probes.

---

## First-run database initialization

The application manages its own database schema. After the backend is deployed and reachable, call the following endpoint **once** to apply pending schema changes and seed initial data:

```text
POST /health/db/seed-once
```

- Subsequent calls are safe — they return a conflict response and do nothing.
- The endpoint handles both schema migration and data seeding atomically.

---

## Containerization considerations

- The ORM client **must be generated** (`pnpm db:generate`) as part of the build process — it produces code that the compiled app depends on at runtime.
- A multi-stage Docker build is strongly recommended: use one stage for building, a separate stage for the production image.
- Only `dist/`, `node_modules/` (production deps only), and the generated ORM client need to be present in the final image — source files are not required.
- `DATABASE_URL` must be provided at **runtime**, not baked into the image.
- The application does not serve static files; no volume mounts are needed.

---

## API surface (brief)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | API and DB health status |
| `POST` | `/health/db/seed-once` | One-time schema migration + data seed |
| `GET` | `/students` | List all students |
| `POST` | `/students` | Create a student |
| `PATCH` | `/students/:id` | Update a student |
| `DELETE` | `/students/:id` | Delete a student |
