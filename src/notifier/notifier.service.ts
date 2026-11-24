import { Inject, Injectable } from '@nestjs/common';
import { NotificationPayload, WEBHOOK_SENDER, WebhookSender } from './webhook-sender.interface';

@Injectable()
export class NotifierService {
  constructor(@Inject(WEBHOOK_SENDER) private readonly webhookSender: WebhookSender) {}

  async notify(payload: NotificationPayload): Promise<void> {
    await this.webhookSender.send(payload);
  }
}
