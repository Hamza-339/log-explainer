import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/pg-pool.token';
import { CreateErrorEventDto } from '../ingest/create-error-event.dto';
import { NotifierService } from '../notifier/notifier.service';
import { EXPLAINER_LLM_CLIENT, ExplainerLlmClient } from './explainer-llm-client.interface';

@Injectable()
export class ExplainerService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(EXPLAINER_LLM_CLIENT) private readonly llmClient: ExplainerLlmClient,
    private readonly notifierService: NotifierService,
  ) {}

  async explainNewError(errorEvent: CreateErrorEventDto, fingerprint: string): Promise<void> {
    const { rows } = await this.pool.query(
      'SELECT COUNT(*) FROM raw_error_events WHERE fingerprint = $1',
      [fingerprint],
    );
    const occurrenceCount = Number(rows[0].count);

    const explanation = await this.llmClient.explain({
      errorEvent: {
        errorType: errorEvent.errorType,
        message: errorEvent.message,
        stack: errorEvent.stack,
        service: errorEvent.service,
        environment: errorEvent.environment,
      },
      occurrenceCount,
    });

    await this.pool.query(
      `INSERT INTO explanations (fingerprint, summary, root_cause, suggested_fix, severity)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (fingerprint) DO NOTHING`,
      [fingerprint, explanation.summary, explanation.rootCause, explanation.suggestedFix, explanation.severity],
    );

    await this.notifierService.notify({
      fingerprint,
      errorType: errorEvent.errorType,
      summary: explanation.summary,
      rootCause: explanation.rootCause,
      suggestedFix: explanation.suggestedFix,
      severity: explanation.severity,
    });
  }
}
