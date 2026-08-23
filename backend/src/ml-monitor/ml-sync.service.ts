import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MlListing } from './ml-listing.entity';
import { MlProviderAdapterService } from './ml-provider-adapter.service';

@Injectable()
export class MlSyncService {
  private readonly logger = new Logger(MlSyncService.name);

  constructor(
    @InjectRepository(MlListing)
    private readonly listings: Repository<MlListing>,
    private readonly mlAdapter: MlProviderAdapterService,
  ) {}

  async syncPrice(orgId: string, variantId: string, newPrice: number): Promise<void> {
    const activeListings = await this.listings.find({
      where: { productVariantId: variantId, mlItemId: () => 'IS NOT NULL' } as any,
    });

    for (const listing of activeListings) {
      if (!listing.mlItemId || listing.status !== 'active') continue;
      try {
        await this.mlAdapter.updateItem(orgId, listing.mlItemId, { price: newPrice });
        listing.preco = String(newPrice);
        listing.lastSyncAt = new Date();
        listing.lastError = null;
        await this.listings.save(listing);
        this.logger.log(`ML sync preço: ${listing.mlItemId} → R$ ${newPrice}`);
      } catch (err: any) {
        listing.lastError = err.message;
        await this.listings.save(listing);
        this.logger.error(`ML sync preço falhou ${listing.mlItemId}: ${err.message}`);
      }
    }
  }

  async syncStock(orgId: string, variantId: string, quantity: number): Promise<void> {
    const activeListings = await this.listings.find({
      where: { productVariantId: variantId, mlItemId: () => 'IS NOT NULL' } as any,
    });

    for (const listing of activeListings) {
      if (!listing.mlItemId || listing.status !== 'active') continue;
      try {
        await this.mlAdapter.updateItem(orgId, listing.mlItemId, { quantity });
        listing.quantidade = quantity;
        listing.lastSyncAt = new Date();
        listing.lastError = null;
        await this.listings.save(listing);
        this.logger.log(`ML sync estoque: ${listing.mlItemId} → ${quantity}`);
      } catch (err: any) {
        listing.lastError = err.message;
        await this.listings.save(listing);
        this.logger.error(`ML sync estoque falhou ${listing.mlItemId}: ${err.message}`);
      }
    }
  }
}
