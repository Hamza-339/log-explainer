import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from './pg-pool.token';

@Injectable()
export class DatabaseSchemaInitializer implements OnModuleInit {
  constructor(@Inject(PG_POOL) readonly pool: Pool) {}

  async onModuleInit(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS raw_error_events (
        id BIGSERIAL PRIMARY KEY,
        error_type TEXT NOT NULL,
        message TEXT NOT NULL,
        stack TEXT,
        service TEXT,
        environment TEXT,
        occurred_at TIMESTAMPTZ,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS fingerprints (
        fingerprint TEXT PRIMARY KEY,
        error_type TEXT NOT NULL,
        first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS explanations (
        fingerprint TEXT PRIMARY KEY REFERENCES fingerprints (fingerprint),
        summary TEXT NOT NULL,
        root_cause TEXT NOT NULL,
        suggested_fix TEXT NOT NULL,
        severity TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }
}
