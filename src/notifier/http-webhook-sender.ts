import { Injectable } from '@nestjs/common';
import { NotificationPayload, WebhookSender } from './webhook-sender.interface';

@Injectable()
export class HttpWebhookSender implements WebhookSender {
  async send(payload: NotificationPayload): Promise<void> {
    const url = process.env.NOTIFICATION_WEBHOOK_URL;
    if (!url) {
      return;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Best-effort delivery (ADR-0001, no retry queue): log and move on rather
      // than throwing, since a non-2xx response doesn't reject the fetch promise.
      console.error(`Webhook delivery failed with status ${response.status}`);
    }
  }
}
