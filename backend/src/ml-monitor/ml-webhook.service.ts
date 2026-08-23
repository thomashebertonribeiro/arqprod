import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MlListing } from './ml-listing.entity';
import { MlProviderAdapterService } from './ml-provider-adapter.service';
import { MlMonitorService } from './ml-monitor.service';

export interface MlNotification {
  resource: string;
  user_id: number;
  topic: 'items' | 'orders' | 'payments';
}

@Injectable()
export class MlWebhookService {
  private readonly logger = new Logger(MlWebhookService.name);

  constructor(
    @InjectRepository(MlListing)
    private readonly listings: Repository<MlListing>,
    private readonly mlAdapter: MlProviderAdapterService,
    private readonly monitorService: MlMonitorService,
  ) {}

  async handleNotification(orgId: string, notification: MlNotification): Promise<void> {
    this.logger.log(`ML webhook recebido: topic=${notification.topic} resource=${notification.resource}`);

    switch (notification.topic) {
      case 'items':
        await this.handleItemNotification(orgId, notification);
        break;
      case 'orders':
        this.logger.log(`Pedido ML recebido: ${notification.resource} — implementar webhook de pedidos`);
        break;
      case 'payments':
        this.logger.log(`Pagamento ML recebido: ${notification.resource}`);
        break;
    }
  }

  private async handleItemNotification(orgId: string, notification: MlNotification): Promise<void> {
    const itemIdMatch = notification.resource?.match(/\/items\/(\d+)/);
    if (!itemIdMatch) {
      this.logger.warn(`Resource ML inválido: ${notification.resource}`);
      return;
    }

    const mlItemId = itemIdMatch[1];
    const listing = await this.listings.findOne({
      where: { mlItemId, organizationId: orgId },
    });

    if (!listing) {
      this.logger.warn(`Listing não encontrado para ml_item_id=${mlItemId}`);
      return;
    }

    try {
      const item = await this.mlAdapter.getItem(orgId, mlItemId);
      listing.status = item.status === 'active' ? 'active'
        : item.status === 'paused' ? 'paused'
        : item.status === 'closed' ? 'ended'
        : 'error';
      listing.preco = String(item.price);
      listing.quantidade = item.available_quantity;
      listing.title = item.title;
      listing.mlPermalink = item.permalink;
      listing.lastSyncAt = new Date();
      listing.lastError = null;
      listing.mlUpdatedAt = item.last_updated ? new Date(item.last_updated) : null;
      await this.listings.save(listing);
      this.logger.log(`Listing ${mlItemId} sincronizado via webhook: status=${listing.status}`);
    } catch (err: any) {
      listing.lastError = err.message;
      await this.listings.save(listing);
      this.logger.error(`Erro ao sincronizar listing ${mlItemId}: ${err.message}`);
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCronSyncAll(): Promise<void> {
    this.logger.log('Cron ML sync: iniciando sincronização periódica');

    const orgs = await this.listings
      .createQueryBuilder('l')
      .select('DISTINCT l.organization_id', 'orgId')
      .getRawMany<{ orgId: string }>();

    for (const { orgId } of orgs) {
      try {
        const auth = await this.mlAdapter.getAuthConfig(orgId);
        if (!auth?.user_id || !auth?.access_token) continue;

        const result = await this.monitorService.syncAllFromMl(orgId);
        this.logger.log(`ML sync org ${orgId}: ${result.synced} sincronizados, ${result.errors} erros`);
      } catch (err: any) {
        this.logger.error(`ML sync org ${orgId} falhou: ${err.message}`);
      }
    }
  }
}
