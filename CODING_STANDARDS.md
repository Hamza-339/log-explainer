# Coding Standards

Read during review. Enforce every rule below against the diff.

## Testing

Tests drive behavior through the front door and assert only what an outside caller can observe.

- **Drive through the HTTP seam.** Exercise features via `POST /ingest` (supertest against the real Nest app), not by calling services or methods directly.
- **Fake only the external edges.** Swap the LLM explainer (Anthropic client) and the outgoing webhook sender via Nest DI. Nothing else is faked.
- **Keep Postgres real.** Run tests against a real throwaway Neon Postgres — locally a Neon test branch via `DATABASE_URL`, in CI a Postgres service container. Never substitute an in-memory or fake repository.
- **Assert external behavior, not implementation.** Check persisted rows, response status, and captured webhook payloads — never private methods, internal call counts, or data shapes the caller cannot see.
- **Await background work.** Since explain + notify run in `waitUntil`, tests await the background hook before asserting.

## Domain vocabulary

Name domain concepts with the terms in `GLOSSARY.md` — **error event**, **fingerprint** — and avoid the synonyms it lists (`log`, `exception`, `signature`, `dedupe key`). Flag identifiers or prose that drift.

## Architecture

Respect `docs/adr/`. ADR-0001 fixes serverless/Neon and background `waitUntil` processing: no local-disk state, no separate worker or queue, pooled DB connections. Flag deviations.
