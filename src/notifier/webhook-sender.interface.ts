import { ErrorSeverity } from '../explainer/explainer-llm-client.interface';

export const WEBHOOK_SENDER = 'WEBHOOK_SENDER';

export interface NotificationPayload {
  fingerprint: string;
  errorType: string;
  summary: string;
  rootCause: string;
  suggestedFix: string;
  severity: ErrorSeverity;
}

export interface WebhookSender {
  send(payload: NotificationPayload): Promise<void>;
}
