# Serverless on Vercel with Neon Postgres

Log Explainer deploys as a NestJS app on Vercel serverless functions, so there is no persistent local filesystem and no long-running process. We therefore use **Neon (serverless Postgres)** for all persistence instead of SQLite — a SQLite file would not survive between invocations. For the same reason, an ingest request **acks immediately (`202`) and runs the explain + notify work in Vercel's `waitUntil` background hook** rather than blocking the request or relying on a separate worker/queue.

## Considered Options

- **SQLite (rejected):** the obvious zero-ops choice for a single small app, but the serverless filesystem is ephemeral, so stored fingerprints and explanations would vanish between invocations.
- **Dedicated Postgres / a message queue (rejected):** heavier operationally than this app warrants; Neon's serverless Postgres and `waitUntil` cover the need without standing infrastructure.

## Consequences

- Database access must use Neon's pooled/serverless connection path, since serverless functions open connections per invocation.
- Explain + notify are best-effort background work; if a function is torn down early the webhook may not fire. Acceptable for a single small app.
