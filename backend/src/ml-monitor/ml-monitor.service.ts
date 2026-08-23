import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MlListing, MlListingStatus } from './ml-listing.entity';
import { MlProviderAdapterService } from './ml-provider-adapter.service';
import { ProductsService } from '../products/products.service';
import { ProductVariant } from '../products/product-variant.entity';

@Injectable()
export class MlMonitorService {
  private readonly logger = new Logger(MlMonitorService.name);

  constructor(
    @InjectRepository(MlListing)
    private readonly listings: Repository<MlListing>,
    @InjectRepository(ProductVariant)
    private readonly variants: Repository<ProductVariant>,
    private readonly mlAdapter: MlProviderAdapterService,
    private readonly productsService: ProductsService,
  ) {}

  async publish(orgId: string, productId: string, dto: PublishToMlDto): Promise<MlListing> {
    const product = await this.productsService.findOneEnriched(orgId, productId);
    if (!product) throw new NotFoundException('Produto não encontrado');

    const variant = await this.variants.findOne({
      where: { id: dto.variantId, product: { id: productId } as any },
    });
    if (!variant) throw new NotFoundException('Variante não encontrada');

    const existing = await this.listings.findOne({
      where: { productVariantId: dto.variantId, mlItemId: In([null, '']) as any },
    });

    const price = dto.price ?? (product as any).custo ?? '0';
    const qty = dto.quantity ?? 1;

    const mlItem = {
      title: dto.title ?? (product as any).nome ?? '',
      category_id: dto.categoryId,
      price: Number(price),
      currency_id: dto.currency ?? 'BRL',
      quantity: qty,
      condition: dto.condition ?? 'new',
      description: dto.description ?? (product as any).descricao ?? '',
      pictures: (dto.pictures ?? (product as any).images ?? []).map((p: any) => ({
        source: p.url?.startsWith('http') ? p.url : `${process.env.API_URL ?? 'http://76.13.167.210:3000'}${p.url}`,
      })),
      attributes: dto.attributes ?? [],
      shipping: dto.shipping ?? { free_shipping: false, mode: 'me2' },
    };

    let result: any;
    try {
      if (existing?.mlItemId) {
        result = await this.mlAdapter.updateItem(orgId, existing.mlItemId, mlItem);
        existing.status = 'active';
        existing.preco = String(price);
        existing.quantidade = qty;
        existing.title = mlItem.title;
        existing.description = mlItem.description;
        existing.lastSyncAt = new Date();
        existing.lastError = null;
        await this.listings.save(existing);
        return existing;
      }

      result = await this.mlAdapter.createItem(orgId, mlItem);
    } catch (err: any) {
      this.logger.error(`Erro ao publicar no ML: ${err.message}`);

      let listing = existing;
      if (!listing) {
        listing = this.listings.create({
          organizationId: orgId,
          productId,
          productVariantId: dto.variantId,
          status: 'error',
          preco: String(price),
          quantidade: qty,
          title: mlItem.title,
          lastError: err.message,
        });
      } else {
        listing.status = 'error';
        listing.lastError = err.message;
      }
      await this.listings.save(listing);
      throw new BadRequestException(`Falha ao publicar: ${err.message}`);
    }

    const listing = existing ?? this.listings.create({
      organizationId: orgId,
      productId,
      productVariantId: dto.variantId,
    });

    listing.mlItemId = result.id;
    listing.mlPermalink = result.permalink;
    listing.status = 'active';
    listing.preco = String(result.price ?? price);
    listing.quantidade = result.available_quantity ?? qty;
    listing.title = result.title;
    listing.categoryMlb = result.category_id;
    listing.condition = result.condition;
    listing.attributes = result.attributes ?? [];
    listing.pictures = (result.pictures ?? []).map((p: any) => ({ id: p.id, url: p.secure_url ?? p.url }));
    listing.shipping = result.shipping ?? {};
    listing.sellerId = String(result.seller_id ?? '');
    listing.lastSyncAt = new Date();
    listing.lastError = null;
    listing.mlCreatedAt = result.date_created ? new Date(result.date_created) : null;
    listing.mlUpdatedAt = result.last_updated ? new Date(result.last_updated) : null;

    await this.listings.save(listing);
    this.logger.log(`Produto publicado no ML: ${listing.mlItemId}`);
    return listing;
  }

  async listListings(orgId: string, filters: { productId?: string; status?: MlListingStatus; page?: number; perPage?: number } = {}): Promise<{ data: MlListing[]; meta: any }> {
    const { productId, status, page = 1, perPage = 20 } = filters;
    const qb = this.listings
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.product', 'p')
      .leftJoinAndSelect('l.productVariant', 'pv')
      .where('l.organization_id = :orgId', { orgId });

    if (productId) qb.andWhere('l.product_id = :productId', { productId });
    if (status) qb.andWhere('l.status = :status', { status });

    qb.orderBy('l.criado_em', 'DESC');
    const total = await qb.getCount();
    const data = await qb.skip((page - 1) * perPage).take(perPage).getMany();

    return { data, meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) } };
  }

  async getListing(orgId: string, id: string): Promise<MlListing> {
    const listing = await this.listings.findOne({
      where: { id, organizationId: orgId },
      relations: ['product', 'productVariant'],
    });
    if (!listing) throw new NotFoundException('Listing não encontrado');
    return listing;
  }

  async syncFromMl(orgId: string, id: string): Promise<MlListing> {
    const listing = await this.getListing(orgId, id);
    if (!listing.mlItemId) throw new BadRequestException('Listing ainda não foi publicado no ML');

    try {
      const item = await this.mlAdapter.getItem(orgId, listing.mlItemId);
      listing.status = item.status === 'active' ? 'active' : item.status === 'paused' ? 'paused' : 'ended';
      listing.preco = String(item.price);
      listing.quantidade = item.available_quantity;
      listing.title = item.title;
      listing.mlPermalink = item.permalink;
      listing.lastSyncAt = new Date();
      listing.lastError = null;
      listing.mlUpdatedAt = item.last_updated ? new Date(item.last_updated) : null;
      await this.listings.save(listing);
    } catch (err: any) {
      listing.lastError = err.message;
      await this.listings.save(listing);
      throw new BadRequestException(`Erro ao sincronizar: ${err.message}`);
    }

    return listing;
  }

  async syncAllFromMl(orgId: string): Promise<{ synced: number; errors: number }> {
    const allListings = await this.listings.find({
      where: { organizationId: orgId, mlItemId: In([null, '']) as any },
    });

    const auth = await this.mlAdapter.getAuthConfig(orgId);
    if (!auth?.user_id) throw new BadRequestException('Seller ID não disponível');

    let synced = 0;
    let errors = 0;

    try {
      const result = await this.mlAdapter.getSellerItems(orgId, String(auth.user_id));
      const mlItemIds: string[] = result.results ?? [];

      for (const mlItemId of mlItemIds) {
        try {
          const item = await this.mlAdapter.getItem(orgId, mlItemId);
          const existing = allListings.find((l) => l.mlItemId === mlItemId);
          if (existing) {
            existing.status = item.status === 'active' ? 'active' : item.status === 'paused' ? 'paused' : 'ended';
            existing.preco = String(item.price);
            existing.quantidade = item.available_quantity;
            existing.lastSyncAt = new Date();
            await this.listings.save(existing);
            synced++;
          }
        } catch {
          errors++;
        }
      }
    } catch (err: any) {
      this.logger.error(`Erro ao buscar itens do seller: ${err.message}`);
      throw err;
    }

    return { synced, errors };
  }

  async pauseListing(orgId: string, id: string): Promise<MlListing> {
    const listing = await this.getListing(orgId, id);
    if (!listing.mlItemId) throw new BadRequestException('Listing não publicado');

    await this.mlAdapter.pauseItem(orgId, listing.mlItemId);
    listing.status = 'paused';
    listing.lastSyncAt = new Date();
    await this.listings.save(listing);
    return listing;
  }

  async activateListing(orgId: string, id: string): Promise<MlListing> {
    const listing = await this.getListing(orgId, id);
    if (!listing.mlItemId) throw new BadRequestException('Listing não publicado');

    await this.mlAdapter.activateItem(orgId, listing.mlItemId);
    listing.status = 'active';
    listing.lastSyncAt = new Date();
    await this.listings.save(listing);
    return listing;
  }

  async endListing(orgId: string, id: string): Promise<MlListing> {
    const listing = await this.getListing(orgId, id);
    if (!listing.mlItemId) throw new BadRequestException('Listing não publicado');

    await this.mlAdapter.endItem(orgId, listing.mlItemId);
    listing.status = 'ended';
    listing.lastSyncAt = new Date();
    await this.listings.save(listing);
    return listing;
  }

  async updatePrice(orgId: string, id: string, newPrice: number): Promise<MlListing> {
    const listing = await this.getListing(orgId, id);
    if (!listing.mlItemId) throw new BadRequestException('Listing não publicado');

    await this.mlAdapter.updateItem(orgId, listing.mlItemId, { price: newPrice });
    listing.preco = String(newPrice);
    listing.lastSyncAt = new Date();
    await this.listings.save(listing);
    return listing;
  }

  async updateStock(orgId: string, id: string, quantity: number): Promise<MlListing> {
    const listing = await this.getListing(orgId, id);
    if (!listing.mlItemId) throw new BadRequestException('Listing não publicado');

    await this.mlAdapter.updateItem(orgId, listing.mlItemId, { quantity });
    listing.quantidade = quantity;
    listing.lastSyncAt = new Date();
    await this.listings.save(listing);
    return listing;
  }

  async deleteListing(orgId: string, id: string): Promise<void> {
    const listing = await this.getListing(orgId, id);
    if (listing.mlItemId) {
      try {
        await this.mlAdapter.endItem(orgId, listing.mlItemId);
      } catch {
        this.logger.warn(`Não foi possível encerrar listing ${listing.mlItemId} no ML`);
      }
    }
    await this.listings.delete(listing.id);
  }

  async getAuthStatus(orgId: string): Promise<{ configured: boolean; userId?: number; nickname?: string }> {
    const auth = await this.mlAdapter.getAuthConfig(orgId);
    if (!auth?.access_token) return { configured: false };
    return { configured: true, userId: auth.user_id, nickname: auth.nickname };
  }

  async saveCredentials(orgId: string, config: {
    access_token: string;
    refresh_token?: string;
    client_id?: string;
    client_secret?: string;
  }): Promise<void> {
    const authConfig: any = {
      access_token: config.access_token,
      refresh_token: config.refresh_token,
    };

    let userId: number | undefined;
    let nickname: string | undefined;
    try {
      await this.mlAdapter.saveAuthConfig(orgId, authConfig);
      const user = await this.mlAdapter.getUserInfo(orgId);
      userId = user.id;
      nickname = user.nickname;
    } catch {
      this.logger.warn('Não foi possível validar o token agora');
    }

    authConfig.user_id = userId;
    authConfig.nickname = nickname;
    await this.mlAdapter.saveAuthConfig(orgId, authConfig);

    if (config.client_id || config.client_secret) {
      const integration = await this.mlAdapter['integrations'].findOne({
        where: { organizationId: orgId, tipo: 'mercado_livre' },
      });
      if (integration) {
        integration.configuracao = {
          ...(integration.configuracao as Record<string, unknown>),
          client_id: config.client_id,
          client_secret: config.client_secret,
        };
        await this.mlAdapter['integrations'].save(integration);
      }
    }
  }

  async getReadinessForMl(orgId: string, productId: string): Promise<Record<string, unknown>> {
    const product = await this.productsService.findOneEnriched(orgId, productId);
    const missing: string[] = [];
    const warnings: string[] = [];

    if (!(product as any).nome) missing.push('nome');
    if (!(product as any).descricao) missing.push('descricao');
    if (!(product as any).ean_gtin) missing.push('ean_gtin');
    if (!(product as any).custo) missing.push('custo');
    if (!(product as any).images?.length) missing.push('imagens');
    if (!(product as any).brand) warnings.push('marca');
    if (!(product as any).ncm) warnings.push('ncm');

    const score = Math.max(0, 100 - missing.length * 20 - warnings.length * 5);

    return {
      product_id: productId,
      marketplace: 'mercado_livre',
      score,
      pronto: missing.length === 0,
      obrigatorios_ok: Object.keys(product).filter(
        (k) => ['nome', 'descricao', 'ean_gtin', 'custo'].includes(k) && (product as any)[k],
      ),
      obrigatorios_faltando: missing,
      alertas: warnings,
    };
  }
}

export interface PublishToMlDto {
  variantId: string;
  categoryId: string;
  title?: string;
  description?: string;
  price?: string;
  quantity?: number;
  currency?: string;
  condition?: string;
  pictures?: { url: string }[];
  attributes?: { id_name: string; value_name: string }[];
  shipping?: Record<string, unknown>;
}
