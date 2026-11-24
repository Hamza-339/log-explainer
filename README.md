# Log Explainer

A push-based service that receives error events from a single small application and uses an LLM to explain each new error in plain language. See `GLOSSARY.md` for domain vocabulary and `docs/adr/` for architecture decisions.

## Getting started

Run the setup wizard to configure your local `.env`:

```sh
./scripts/setup.sh
```

It walks you through getting a Neon pooled `DATABASE_URL`, an `ANTHROPIC_API_KEY`, and (optionally) a notification webhook URL.

Then:

```sh
npm install
npm test
```
