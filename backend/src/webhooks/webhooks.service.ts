import { createHmac } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { In, Repository } from 'typeorm';
import { Webhook } from './webhook.entity';
import { WebhookDelivery } from './webhook-delivery.entity';

export const WEBHOOK_EVENTS = [
  'product.created',
  'product.updated',
  'variant.created',
  'variant.updated',
  'price.updated',
  'stock.updated',
] as const;

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(Webhook)
    private readonly webhooks: Repository<Webhook>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveries: Repository<WebhookDelivery>,
    @InjectQueue('webhooks')
    private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {}

  /** Enfileira a entrega do evento para os webhooks da organização. */
  async dispatch(orgId: string, evento: string, payload: Record<string, unknown>) {
    if (!(WEBHOOK_EVENTS as readonly string[]).includes(evento)) return;
    try {
      await this.queue.add('deliver', { orgId, evento, payload }, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 1000,
      });
    } catch (err) {
      this.logger.error(`Falha ao enfileirar webhook ${evento}`, err);
    }
  }

  /** Executado pelo worker: entrega o payload com HMAC-SHA256. */
  async deliver(job: { orgId: string; evento: string; payload: Record<string, unknown> }) {
    const { orgId, evento, payload } = job;
    const targets = await this.webhooks.find({
      where: { organizationId: orgId, status: 'ativo' },
    });
    const matching = targets.filter((w) =>
      w.eventos.includes('*') || w.eventos.includes(evento),
    );
    for (const webhook of matching) {
      await this.send(webhook, evento, payload);
    }
  }

  private async send(
    webhook: Webhook,
    evento: string,
    payload: Record<string, unknown>,
  ) {
    const body = JSON.stringify({
      evento,
      enviado_em: new Date().toISOString(),
      org_slug: null,
      dados: payload,
    });
    const signature = webhook.segredo
      ? createHmac('sha256', webhook.segredo).update(body).digest('hex')
      : null;

    const delivery = this.deliveries.create({
      webhookId: webhook.id,
      evento,
      payload: { ...payload },
    });
    await this.deliveries.save(delivery);

    try {
      const response = await fetch(webhook.urlDestino, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Arqprod-Webhook/0.1',
          ...(signature ? { 'X-Arqprod-Signature': `sha256=${signature}` } : {}),
        },
        body,
        signal: AbortSignal.timeout(10000),
      });
      delivery.statusHttpResposta = response.status;
      delivery.tentativas += 1;
      delivery.enviadoEm = new Date();
      await this.deliveries.save(delivery);
    } catch (err) {
      delivery.tentativas += 1;
      await this.deliveries.save(delivery);
      this.logger.warn(
        `Webhook ${webhook.id} falhou na tentativa ${delivery.tentativas}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  async deliveriesOf(orgId: string, webhookId: string) {
    const webhook = await this.webhooks.findOne({
      where: { id: webhookId, organizationId: orgId },
    });
    if (!webhook) return { data: [] };
    const rows = await this.deliveries.find({
      where: { webhookId: webhook.id },
      order: { enviadoEm: 'DESC' },
      take: 50,
    });
    return { data: rows };
  }

  async countDeliveries(webhookIds: string[]) {
    if (!webhookIds.length) return new Map<string, number>();
    const rows = await this.deliveries
      .createQueryBuilder('d')
      .select('d.webhook_id', 'webhook_id')
      .addSelect('COUNT(*)::int', 'total')
      .where({ webhookId: In(webhookIds) })
      .groupBy('d.webhook_id')
      .getRawMany<{ webhook_id: string; total: number }>();
    return new Map(rows.map((r) => [r.webhook_id, r.total]));
  }
}