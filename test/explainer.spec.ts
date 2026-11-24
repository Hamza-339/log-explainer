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

describe('Explainer background work', () => {
  let app: INestApplication;
  let pool: Pool;
  let fakeLlmClient: FakeExplainerLlmClient;
  let backgroundWork: BackgroundWorkService;

  beforeAll(async () => {
    fakeLlmClient = new FakeExplainerLlmClient();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EXPLAINER_LLM_CLIENT)
      .useValue(fakeLlmClient)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createValidationPipe());
    await app.init();
    pool = app.get<Pool>(PG_POOL);
    backgroundWork = app.get(BackgroundWorkService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('persists one explanation for a novel fingerprint, from the LLM client', async () => {
    const errorType = uniqueErrorType('NovelExplainedError');

    await request(app.getHttpServer())
      .post('/ingest')
      .send({ errorType, message: 'Something went wrong' })
      .expect(202);

    await backgroundWork.flush();

    const { rows } = await pool.query(
      `SELECT e.summary, e.root_cause, e.suggested_fix, e.severity
       FROM explanations e
       JOIN fingerprints f ON f.fingerprint = e.fingerprint
       WHERE f.error_type = $1`,
      [errorType],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      summary: fakeLlmClient.cannedExplanation.summary,
      root_cause: fakeLlmClient.cannedExplanation.rootCause,
      suggested_fix: fakeLlmClient.cannedExplanation.suggestedFix,
      severity: fakeLlmClient.cannedExplanation.severity,
    });
  });

  it('does not call the LLM client or persist a second explanation for a repeat fingerprint', async () => {
    const errorType = uniqueErrorType('RepeatExplainedError');
    const payload = { errorType, message: 'Repeat failure' };

    await request(app.getHttpServer()).post('/ingest').send(payload).expect(202);
    await backgroundWork.flush();

    await request(app.getHttpServer()).post('/ingest').send(payload).expect(202);
    await backgroundWork.flush();

    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM explanations e
       JOIN fingerprints f ON f.fingerprint = e.fingerprint
       WHERE f.error_type = $1`,
      [errorType],
    );
    expect(rows[0].count).toBe('1');
  });
});
