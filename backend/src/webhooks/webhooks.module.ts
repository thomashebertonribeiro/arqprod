import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Webhook } from './webhook.entity';
import { WebhookDelivery } from './webhook-delivery.entity';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookWorker } from './webhook.worker';

@Module({
  imports: [
    TypeOrmModule.forFeature([Webhook, WebhookDelivery]),
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
      }),
    }),
    BullModule.registerQueue({ name: 'webhooks' }),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookWorker],
  exports: [WebhooksService],
})
export class WebhooksModule {}