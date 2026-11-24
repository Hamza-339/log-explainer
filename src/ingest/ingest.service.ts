import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.token';
import { CreateErrorEventDto } from './create-error-event.dto';

@Injectable()
export class IngestService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async persistErrorEvent(errorEvent: CreateErrorEventDto): Promise<void> {
    await this.pool.query(
      `INSERT INTO raw_error_events
        (error_type, message, stack, service, environment, occurred_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        errorEvent.errorType,
        errorEvent.message,
        errorEvent.stack ?? null,
        errorEvent.service ?? null,
        errorEvent.environment ?? null,
        errorEvent.timestamp ?? null,
        errorEvent.metadata ?? null,
      ],
    );
  }
}
