import 'reflect-metadata';
import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { PG_POOL } from '../src/database/database.module';
import { createValidationPipe } from '../src/validation-pipe';
import {
  ErrorExplanation,
  EXPLAINER_LLM_CLIENT,
  ExplainerLlmClient,
  ExplainerLlmInput,
} from '../src/explainer/explainer-llm-client.interface';
import { BackgroundWorkService } from '../src/background/background-work.service';

const uniqueErrorType = (base: string): string => `${base}_${randomUUID()}`;

class FakeExplainerLlmClient implements ExplainerLlmClient {
  readonly cannedExplanation: ErrorExplanation = {
    summary: 'Canned summary',
    rootCause: 'Canned root cause',
    suggestedFix: 'Canned suggested fix',
    severity: 'medium',
  };

  async explain(_input: ExplainerLlmInput): Promise<ErrorExplanation> {
    return this.cannedExplanation;
  }
}

describe('POST /ingest', () => {
  let app: INestApplication;
  let pool: Pool;
  let backgroundWork: BackgroundWorkService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EXPLAINER_LLM_CLIENT)
      .useValue(new FakeExplainerLlmClient())
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createValidationPipe());
    await app.init();
    pool = app.get<Pool>(PG_POOL);
    backgroundWork = app.get(BackgroundWorkService);
  });

  afterAll(async () => {
    await backgroundWork.flush();
    await app.close();
  });

  it('persists a valid error event and returns 202', async () => {
    const payload = {
      errorType: 'TypeError',
      message: 'Cannot read properties of undefined',
      stack: 'TypeError: Cannot read properties of undefined\n    at main.js:1:1',
      service: 'checkout-api',
      environment: 'production',
      timestamp: '2026-11-24T10:00:00.000Z',
      metadata: { userId: 'u_123' },
    };

    const response = await request(app.getHttpServer()).post('/ingest').send(payload);

    expect(response.status).toBe(202);

    const { rows } = await pool.query(
      'SELECT error_type, message, stack, service, environment, occurred_at, metadata FROM raw_error_events ORDER BY id DESC LIMIT 1',
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      error_type: payload.errorType,
      message: payload.message,
      stack: payload.stack,
      service: payload.service,
      environment: payload.environment,
      metadata: payload.metadata,
    });
    expect(new Date(rows[0].occurred_at).toISOString()).toBe(payload.timestamp);
  });

  it('rejects a malformed payload with 400 and persists nothing', async () => {
    const { rows: before } = await pool.query('SELECT COUNT(*) FROM raw_error_events');

    const response = await request(app.getHttpServer())
      .post('/ingest')
      .send({ errorType: 'TypeError' });

    expect(response.status).toBe(400);

    const { rows: after } = await pool.query('SELECT COUNT(*) FROM raw_error_events');
    expect(after[0].count).toBe(before[0].count);
  });

  it('records one fingerprint for a duplicate error and does not drop either event', async () => {
    const errorType = uniqueErrorType('DuplicateError');
    const payload = {
      errorType,
      message: 'Duplicate failure at 2026-11-24T10:00:00.000Z for user 123e4567-e89b-12d3-a456-426614174000',
      stack: `${errorType}: Duplicate failure\n    at worker.js:1:1`,
      environment: 'production',
    };
    const repeat = {
      ...payload,
      message: 'Duplicate failure at 2026-11-25T18:32:07.123Z for user 9f8e7d6c-5b4a-3c2d-1e0f-abcdef123456',
      stack: `${errorType}: Duplicate failure\n    at worker.js:42:7`,
    };

    await request(app.getHttpServer()).post('/ingest').send(payload).expect(202);
    await request(app.getHttpServer()).post('/ingest').send(repeat).expect(202);

    const { rows: rawEvents } = await pool.query(
      'SELECT COUNT(*) FROM raw_error_events WHERE error_type = $1',
      [errorType],
    );
    expect(rawEvents[0].count).toBe('2');

    const { rows: fingerprints } = await pool.query(
      'SELECT COUNT(*) FROM fingerprints WHERE error_type = $1',
      [errorType],
    );
    expect(fingerprints[0].count).toBe('1');
  });

  it('records two fingerprints for two distinct errors', async () => {
    const errorTypeA = uniqueErrorType('DistinctErrorA');
    const errorTypeB = uniqueErrorType('DistinctErrorB');

    await request(app.getHttpServer())
      .post('/ingest')
      .send({ errorType: errorTypeA, message: 'First distinct failure' })
      .expect(202);
    await request(app.getHttpServer())
      .post('/ingest')
      .send({ errorType: errorTypeB, message: 'Second distinct failure' })
      .expect(202);

    const { rows: fingerprints } = await pool.query(
      'SELECT COUNT(*) FROM fingerprints WHERE error_type IN ($1, $2)',
      [errorTypeA, errorTypeB],
    );
    expect(fingerprints[0].count).toBe('2');
  });

  it('fingerprints a stackless error event via the type + message fallback', async () => {
    const errorType = uniqueErrorType('StacklessError');

    const response = await request(app.getHttpServer())
      .post('/ingest')
      .send({ errorType, message: 'Failure with no stack trace' });

    expect(response.status).toBe(202);

    const { rows: fingerprints } = await pool.query(
      'SELECT COUNT(*) FROM fingerprints WHERE error_type = $1',
      [errorType],
    );
    expect(fingerprints[0].count).toBe('1');
  });

  it('dedupes the same error reported from staging and prod into a single fingerprint', async () => {
    const errorType = uniqueErrorType('CrossEnvError');

    await request(app.getHttpServer())
      .post('/ingest')
      .send({ errorType, message: 'Same bug everywhere', environment: 'staging' })
      .expect(202);
    await request(app.getHttpServer())
      .post('/ingest')
      .send({ errorType, message: 'Same bug everywhere', environment: 'production' })
      .expect(202);

    const { rows: fingerprints } = await pool.query(
      'SELECT COUNT(*) FROM fingerprints WHERE error_type = $1',
      [errorType],
    );
    expect(fingerprints[0].count).toBe('1');
  });
});
