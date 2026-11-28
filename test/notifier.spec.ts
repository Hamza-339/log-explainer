import 'reflect-metadata';
import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { createValidationPipe } from '../src/validation-pipe';
import {
  ErrorExplanation,
  EXPLAINER_LLM_CLIENT,
  ExplainerLlmClient,
  ExplainerLlmInput,
} from '../src/explainer/explainer-llm-client.interface';
import { NotificationPayload, WEBHOOK_SENDER, WebhookSender } from '../src/notifier/webhook-sender.interface';
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

class FakeWebhookSender implements WebhookSender {
  readonly calls: NotificationPayload[] = [];

  async send(payload: NotificationPayload): Promise<void> {
    this.calls.push(payload);
  }
}

describe('Notifier background work', () => {
  let app: INestApplication;
  let fakeLlmClient: FakeExplainerLlmClient;
  let fakeWebhookSender: FakeWebhookSender;
  let backgroundWork: BackgroundWorkService;

  beforeAll(async () => {
    fakeLlmClient = new FakeExplainerLlmClient();
    fakeWebhookSender = new FakeWebhookSender();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EXPLAINER_LLM_CLIENT)
      .useValue(fakeLlmClient)
      .overrideProvider(WEBHOOK_SENDER)
      .useValue(fakeWebhookSender)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createValidationPipe());
    await app.init();
    backgroundWork = app.get(BackgroundWorkService);
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  it('calls the webhook once with the explanation for a novel error', async () => {
    const errorType = uniqueErrorType('NovelNotifiedError');

    await request(app.getHttpServer())
      .post('/ingest')
      .send({ errorType, message: 'Something went wrong' })
      .expect(202);

    await backgroundWork.flush();

    const calls = fakeWebhookSender.calls.filter((call) => call.errorType === errorType);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      errorType,
      summary: fakeLlmClient.cannedExplanation.summary,
      rootCause: fakeLlmClient.cannedExplanation.rootCause,
      suggestedFix: fakeLlmClient.cannedExplanation.suggestedFix,
      severity: fakeLlmClient.cannedExplanation.severity,
    });
  });

  it('does not call the webhook for a repeat fingerprint', async () => {
    const errorType = uniqueErrorType('RepeatNotifiedError');
    const payload = { errorType, message: 'Repeat failure' };

    await request(app.getHttpServer()).post('/ingest').send(payload).expect(202);
    await backgroundWork.flush();

    await request(app.getHttpServer()).post('/ingest').send(payload).expect(202);
    await backgroundWork.flush();

    const calls = fakeWebhookSender.calls.filter((call) => call.errorType === errorType);
    expect(calls).toHaveLength(1);
  });
});
