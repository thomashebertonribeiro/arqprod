import { Worker } from 'bullmq';
import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import IORedis from 'ioredis';
import { WebhooksService } from './webhooks.service';

/**
 * Worker BullMQ que consome a fila "webhooks" e faz as entregas.
 * Em produção roda dentro do mesmo container da API (ou pode ser extraído
 * para um container dedicado — basta publicar o processador).
 */
@Injectable()
export class WebhookWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebhookWorker.name);
  private worker: Worker | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly service: WebhooksService,
  ) {}

  onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    this.worker = new Worker(
      'webhooks',
      async (job) => {
        await this.service.deliver(job.data);
      },
      { connection, concurrency: 5 },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} falhou: ${err.message}`);
    });
    this.worker.on('error', (err) => {
      this.logger.error(`Worker error: ${err.message}`);
    });
    this.logger.log('Webhook worker iniciado');
  }

  onModuleDestroy() {
    this.worker?.close().catch(() => undefined);
  }
}