import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { PG_POOL } from '../src/database/database.module';
import { createValidationPipe } from '../src/validation-pipe';

describe('POST /ingest', () => {
  let app: INestApplication;
  let pool: Pool;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createValidationPipe());
    await app.init();
    pool = app.get<Pool>(PG_POOL);
  });

  afterAll(async () => {
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
});
