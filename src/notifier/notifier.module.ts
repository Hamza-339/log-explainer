import { Module } from '@nestjs/common';
import { HttpWebhookSender } from './http-webhook-sender';
import { NotifierService } from './notifier.service';
import { WEBHOOK_SENDER } from './webhook-sender.interface';

@Module({
  providers: [NotifierService, { provide: WEBHOOK_SENDER, useClass: HttpWebhookSender }],
  exports: [NotifierService],
})
export class NotifierModule {}
