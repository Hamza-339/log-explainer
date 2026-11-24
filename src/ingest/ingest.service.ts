import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { BackgroundWorkService } from '../background/background-work.service';
import { PG_POOL } from '../database/pg-pool.token';
import { ExplainerService } from '../explainer/explainer.service';
import { FingerprintService } from '../fingerprint/fingerprint.service';
import { CreateErrorEventDto } from './create-error-event.dto';

@Injectable()
export class IngestService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly fingerprintService: FingerprintService,
    private readonly explainerService: ExplainerService,
    private readonly backgroundWork: BackgroundWorkService,
  ) {}

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

    const { fingerprint, isNew } = await this.fingerprintService.registerSighting(errorEvent);

    if (isNew) {
      this.backgroundWork.run(() => this.explainerService.explainNewError(errorEvent, fingerprint));
    }
  }
}
