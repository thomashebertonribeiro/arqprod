import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductAttributeValue } from './product-attribute-value.entity';
import { ProductVariantAttributeValue } from './product-variant-attribute-value.entity';
import { ProductImage } from './product-image.entity';
import { Attribute } from '../attributes/attribute.entity';
import { StockItem } from '../stock/stock-item.entity';
import { Price } from '../prices/price.entity';
import { validateAttributeValue } from '../attributes/attribute-value.validator';
import { WebhooksService } from '../webhooks/webhooks.service';
import {
  CreateProductDto,
  CreateVariantDto,
  SaveAttributeValuesDto,
  UpdateProductDto,
  UpdateVariantDto,
} from './dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variants: Repository<ProductVariant>,
    @InjectRepository(ProductAttributeValue)
    private readonly productValues: Repository<ProductAttributeValue>,
    @InjectRepository(ProductVariantAttributeValue)
    private readonly variantValues: Repository<ProductVariantAttributeValue>,
    @InjectRepository(ProductImage)
    private readonly images: Repository<ProductImage>,
    @InjectRepository(Attribute)
    private readonly attributes: Repository<Attribute>,
    @InjectRepository(StockItem)
    private readonly stock: Repository<StockItem>,
    @InjectRepository(Price)
    private readonly prices: Repository<Price>,
    private readonly webhooks: WebhooksService,
    private readonly dataSource: DataSource,
  ) {}

  async create(orgId: string, dto: CreateProductDto) {
    const product = this.products.create({
      organizationId: orgId,
      nome: dto.nome,
      descricao: dto.descricao ?? null,
      skuBase: dto.sku_base ?? null,
      categoryId: dto.category_id ?? null,
      supplierId: dto.supplier_id ?? null,
      status: (dto.status as Product['status']) ?? 'rascunho',
      origemIntegracao: dto.origem_integracao ?? null,
    });
    const saved = await this.products.save(product);
    this.webhooks.dispatch(orgId, 'product.created', { product_id: saved.id }).catch(() => undefined);
    return this.findOne(orgId, saved.id);
  }

  async findOne(orgId: string, id: string) {
    const product = await this.products.findOne({
      where: { id, organizationId: orgId },
      relations: {
        category: true,
        supplier: true,
        variants: true,
        images: true,
        tags: true,
      },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  /**
   * Detalhe no mesmo shape da listagem (snake_case + agregados),
   * incluindo valores de atributos, imagens e tags.
   */
  async findOneEnriched(orgId: string, id: string) {
    const base = await this.findOne(orgId, id);
    const rows = await this.enrich(orgId, [base]);
    if (!rows.length) throw new NotFoundException('Produto não encontrado');
    const enriched = rows[0];

    const values = await this.productValues.find({
      where: { productId: base.id },
      relations: { attribute: { validationRules: true, options: true } },
    });

    const variantValues = await this.variantValues.find({
      where: { productVariantId: In(base.variants.map((v) => v.id)) },
      relations: { attribute: true },
    });
    const valuesByVariant = new Map<string, Record<string, unknown>>();
    for (const vv of variantValues) {
      const acc = valuesByVariant.get(vv.productVariantId) ?? {};
      acc[vv.attribute.chave] = vv.valor;
      valuesByVariant.set(vv.productVariantId, acc);
    }

    const fields = await this.attributes.find({
      where: { organizationId: orgId, status: 'ativo' },
      relations: { validationRules: true, options: true },
      order: { criadoEm: 'ASC' },
    });

    return {
      ...enriched,
      fields,
      descricao: base.descricao,
      sku_base: base.skuBase,
      atributos: base.atributos,
      origem_integracao: base.origemIntegracao,
      images: base.images.map((i) => ({
        id: i.id,
        url: i.url,
        alt_text: i.altText,
        ordem: i.ordem,
      })),
      tags: base.tags.map((t) => t.nome),
      attribute_values: values.map((v) => ({
        id: v.id,
        atributo_id: v.attributeId,
        chave: v.attribute.chave,
        nome: v.attribute.nome,
        tipo_dado: v.attribute.tipoDado,
        valor: v.valor,
        atualizado_em: v.atualizadoEm,
      })),
      variants: base.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        ean_gtin: v.eanGtin,
        combinacao: v.combinacao,
        peso_kg: v.pesoKg,
        status: v.status,
        criado_em: v.criadoEm,
        values: valuesByVariant.get(v.id) ?? {},
      })),
    };
  }

  async update(orgId: string, id: string, dto: UpdateProductDto) {
    const product = await this.getOwned(orgId, id);
    if (dto.nome !== undefined) product.nome = dto.nome;
    if (dto.descricao !== undefined) product.descricao = dto.descricao ?? null;
    if (dto.category_id !== undefined) product.categoryId = dto.category_id || null;
    if (dto.supplier_id !== undefined) product.supplierId = dto.supplier_id || null;
    if (dto.status !== undefined) product.status = dto.status as Product['status'];
    await this.products.save(product);
    this.webhooks.dispatch(orgId, 'product.updated', { product_id: id }).catch(() => undefined);
    return this.findOne(orgId, id);
  }

  async remove(orgId: string, id: string) {
    const product = await this.getOwned(orgId, id);
    await this.products.delete(product.id);
    this.webhooks.dispatch(orgId, 'product.deleted', { product_id: id }).catch(() => undefined);
    return { id: product.id };
  }

  async addVariant(orgId: string, productId: string, dto: CreateVariantDto) {
    const product = await this.getOwned(orgId, productId);
    const exists = await this.variants.findOne({ where: { sku: dto.sku } });
    if (exists) throw new BadRequestException(`SKU "${dto.sku}" já em uso`);

    const variant = this.variants.create({
      productId: product.id,
      sku: dto.sku,
      eanGtin: dto.ean_gtin ?? null,
      combinacao: dto.combinacao ?? {},
      pesoKg: dto.peso_kg != null ? String(dto.peso_kg) : null,
      dimensoes: dto.dimensoes ?? null,
    });
    const saved = await this.variants.save(variant);
    await this.rebuildAttributesCache(product);
    this.webhooks.dispatch(orgId, 'variant.created', { variant_id: saved.id, product_id: product.id }).catch(() => undefined);
    return saved;
  }

  async updateVariant(orgId: string, productId: string, variantId: string, dto: UpdateVariantDto) {
    const product = await this.getOwned(orgId, productId);
    const variant = await this.variants.findOne({
      where: { id: variantId, productId: product.id },
    });
    if (!variant) throw new NotFoundException('Variação não encontrada');

    if (dto.sku !== undefined && dto.sku !== variant.sku) {
      const dup = await this.variants.findOne({ where: { sku: dto.sku } });
      if (dup && dup.id !== variant.id) throw new BadRequestException(`SKU "${dto.sku}" já em uso`);
      variant.sku = dto.sku;
    }
    if (dto.ean_gtin !== undefined) variant.eanGtin = dto.ean_gtin;
    if (dto.combinacao !== undefined) variant.combinacao = dto.combinacao;
    if (dto.peso_kg !== undefined) variant.pesoKg = dto.peso_kg != null ? String(dto.peso_kg) : null;
    if (dto.dimensoes !== undefined) variant.dimensoes = dto.dimensoes;
    if (dto.status !== undefined) variant.status = dto.status as ProductVariant['status'];

    await this.variants.save(variant);
    await this.rebuildAttributesCache(product);
    return variant;
  }

  /**
   * Salva valores de atributos de NÍVEL produto.
   * Rejeita atributos de nível variação (regra de negócio #3).
   */
  async saveProductAttributeValues(
    orgId: string,
    productId: string,
    dto: SaveAttributeValuesDto,
    userId?: string,
  ) {
    const product = await this.getOwned(orgId, productId);
    const attrs = await this.resolveAttributes(orgId, dto.valores.map((v) => v.atributo));

    for (const attr of attrs) {
      if (attr.nivel !== 'produto') {
        throw new BadRequestException(
          `Atributo "${attr.chave}" é de nível variação — use /products/:id/variants/:vid/attribute-values`,
        );
      }
    }

    const existing = await this.productValues.find({
      where: { productId: product.id, attributeId: In(attrs.map((a) => a.id)) },
    });
    const byAttr = new Map(existing.map((v) => [v.attributeId, v]));

    for (let i = 0; i < dto.valores.length; i++) {
      const item = dto.valores[i];
      const attr = attrs[i];
      const { valor } = validateAttributeValue(attr, item.valor);
      const row = byAttr.get(attr.id);
      if (row) {
        row.valor = valor;
        row.atualizadoPor = userId ?? null;
        row.atualizadoEm = new Date();
        await this.productValues.save(row);
      } else {
        await this.productValues.save(
          this.productValues.create({
            productId: product.id,
            attributeId: attr.id,
            valor,
            atualizadoPor: userId ?? null,
          }),
        );
      }
    }

    await this.rebuildAttributesCache(product);
    this.webhooks.dispatch(orgId, 'product.updated', { product_id: product.id }).catch(() => undefined);
    return this.getProductAttributeValues(orgId, product.id);
  }

  async getProductAttributeValues(orgId: string, productId: string) {
    const product = await this.getOwned(orgId, productId);
    const rows = await this.productValues.find({
      where: { productId: product.id },
      relations: { attribute: { validationRules: true, options: true } },
    });
    return {
      data: rows.map((r) => ({
        id: r.id,
        atributo_id: r.attributeId,
        chave: r.attribute.chave,
        nome: r.attribute.nome,
        tipo_dado: r.attribute.tipoDado,
        valor: r.valor,
        atualizado_em: r.atualizadoEm,
      })),
    };
  }

  /** Salva valores de atributos de NÍVEL variação. */
  async saveVariantAttributeValues(
    orgId: string,
    productId: string,
    variantId: string,
    dto: SaveAttributeValuesDto,
  ) {
    const product = await this.getOwned(orgId, productId);
    const variant = await this.variants.findOne({
      where: { id: variantId, productId: product.id },
    });
    if (!variant) throw new NotFoundException('Variação não encontrada');

    const attrs = await this.resolveAttributes(orgId, dto.valores.map((v) => v.atributo));
    for (const attr of attrs) {
      if (attr.nivel !== 'variacao') {
        throw new BadRequestException(
          `Atributo "${attr.chave}" é de nível produto — use /products/:id/attribute-values`,
        );
      }
    }

    const existing = await this.variantValues.find({
      where: { productVariantId: variant.id, attributeId: In(attrs.map((a) => a.id)) },
    });
    const byAttr = new Map(existing.map((v) => [v.attributeId, v]));

    for (let i = 0; i < dto.valores.length; i++) {
      const attr = attrs[i];
      const { valor } = validateAttributeValue(attr, dto.valores[i].valor);
      const row = byAttr.get(attr.id);
      if (row) {
        row.valor = valor;
        await this.variantValues.save(row);
      } else {
        await this.variantValues.save(
          this.variantValues.create({
            productVariantId: variant.id,
            attributeId: attr.id,
            valor,
          }),
        );
      }
    }

    await this.rebuildAttributesCache(product);
    this.webhooks.dispatch(orgId, 'variant.updated', { variant_id: variant.id, product_id: product.id }).catch(() => undefined);
    return this.getVariantAttributeValues(orgId, product.id, variant.id);
  }

  async getVariantAttributeValues(orgId: string, productId: string, variantId: string) {
    const product = await this.getOwned(orgId, productId);
    const variant = await this.variants.findOne({
      where: { id: variantId, productId: product.id },
    });
    if (!variant) throw new NotFoundException('Variação não encontrada');
    const rows = await this.variantValues.find({
      where: { productVariantId: variant.id },
      relations: { attribute: true },
    });
    return {
      data: rows.map((r) => ({
        id: r.id,
        atributo_id: r.attributeId,
        chave: r.attribute.chave,
        nome: r.attribute.nome,
        tipo_dado: r.attribute.tipoDado,
        valor: r.valor,
        atualizado_em: r.atualizadoEm,
      })),
    };
  }

  async addImage(orgId: string, productId: string, dto: { url: string; ordem?: number; alt_text?: string }) {
    const product = await this.getOwned(orgId, productId);
    return this.images.save(
      this.images.create({
        productId: product.id,
        url: dto.url,
        ordem: dto.ordem ?? 0,
        altText: dto.alt_text ?? null,
      }),
    );
  }

  /** Reconstrói o cache JSONB `atributos` do produto a cada escrita. */
  async rebuildAttributesCache(product: Product) {
    const [productRows, variants] = await Promise.all([
      this.productValues.find({
        where: { productId: product.id },
        relations: { attribute: true },
      }),
      this.variants.find({
        where: { productId: product.id },
        relations: { attributeValues: { attribute: true } },
      }),
    ]);

    const cache: Record<string, unknown> = {};
    for (const row of productRows) {
      cache[row.attribute.chave] = row.valor;
    }
    cache.variacoes = variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      combinacao: v.combinacao,
      valores: Object.fromEntries(
        v.attributeValues.map((av) => [av.attribute.chave, av.valor]),
      ),
    }));

    await this.dataSource
      .createQueryBuilder()
      .update(Product)
      .set({ atributos: cache })
      .where('id = :id', { id: product.id })
      .execute();
  }

  private async resolveAttributes(
    orgId: string,
    refs: string[],
  ): Promise<Attribute[]> {
    const unique = [...new Set(refs)];
    const byKey = new Map<string, Attribute>();
    const byId = new Map<string, Attribute>();

    for (const ref of unique) {
      const isUuid = /^[0-9a-f-]{36}$/.test(ref);
      const attr = await this.attributes.findOne({
        where: isUuid ? { id: ref, organizationId: orgId } : { chave: ref, organizationId: orgId },
        relations: { validationRules: true, options: true },
      });
      if (!attr) throw new BadRequestException(`Atributo "${ref}" não encontrado`);
      if (attr.status !== 'ativo') {
        throw new BadRequestException(`Atributo "${attr.chave}" está arquivado`);
      }
      if (isUuid) byId.set(attr.id, attr);
      else byKey.set(attr.chave, attr);
    }

    return refs.map((ref) => {
      const isUuid = /^[0-9a-f-]{36}$/.test(ref);
      return (isUuid ? byId.get(ref) : byKey.get(ref))!;
    });
  }

  async getOwned(orgId: string, id: string): Promise<Product> {
    const product = await this.products.findOne({
      where: { id, organizationId: orgId },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  // ---------------------------------------------------------------- agregados

  /**
   * Enriquece produtos com agregados de leitura: estoque, canais, markets,
   * thumbnail, armazém principal. Usado pela listagem e pelo detalhe.
   */
  async enrich(
    orgId: string,
    rows: Product[],
  ): Promise<Record<string, unknown>[]> {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);

    const [variants, images, stockRows, priceRows] = await Promise.all([
      this.variants.find({ where: { productId: In(ids) } }),
      this.images.find({ where: { productId: In(ids) }, order: { ordem: 'ASC' } }),
      this.stock
        .createQueryBuilder('s')
        .select('s.product_variant_id', 'variant_id')
        .addSelect('SUM(s.quantidade - s.reservado)', 'disponivel')
        .where(`s.product_variant_id IN (SELECT id FROM product_variants WHERE product_id IN (:...ids))`, { ids })
        .groupBy('s.product_variant_id')
        .getRawMany<{ variant_id: string; disponivel: string }>(),
      this.prices
        .createQueryBuilder('pr')
        .select('pr.product_variant_id', 'variant_id')
        .addSelect('COUNT(DISTINCT pr.channel_id)::int', 'canais')
        .where(`pr.product_variant_id IN (SELECT id FROM product_variants WHERE product_id IN (:...ids))`, { ids })
        .groupBy('pr.product_variant_id')
        .getRawMany<{ variant_id: string; canais: number }>(),
    ]);

    const variantsByProduct = new Map<string, ProductVariant[]>();
    for (const v of variants) {
      const list = variantsByProduct.get(v.productId) ?? [];
      list.push(v);
      variantsByProduct.set(v.productId, list);
    }
    const stockByVariant = new Map(stockRows.map((s) => [s.variant_id, Number(s.disponivel)]));
    const priceByVariant = new Map(priceRows.map((p) => [p.variant_id, Number(p.canais)]));
    const imageByProduct = new Map<string, ProductImage>();
    for (const img of images) {
      if (img.productId && !imageByProduct.has(img.productId)) {
        imageByProduct.set(img.productId, img);
      }
    }

    // Warehouses do primeiro estoque encontrado (para a coluna "Space")
    const variantIds = variants.map((v) => v.id);
    const spaceByVariant = new Map<string, string>();
    if (variantIds.length) {
      const stockRowsFull = await this.stock.find({
        where: { productVariantId: In(variantIds) },
        relations: { warehouse: true },
        order: { atualizadoEm: 'ASC' },
      });
      for (const s of stockRowsFull) {
        if (!spaceByVariant.has(s.productVariantId)) {
          spaceByVariant.set(s.productVariantId, s.warehouse?.nome ?? '');
        }
      }
    }

    return rows.map((p) => {
      const pVariants = variantsByProduct.get(p.id) ?? [];
      const totalAvailable = pVariants.reduce(
        (acc, v) => acc + (stockByVariant.get(v.id) ?? 0),
        0,
      );
      const hasStock = pVariants.some((v) => stockByVariant.has(v.id));
      const channels = pVariants.reduce(
        (acc, v) => acc + (priceByVariant.get(v.id) ?? 0),
        0,
      );
      const marketsWithStock = pVariants.filter(
        (v) => (priceByVariant.get(v.id) ?? 0) > 0 && (stockByVariant.get(v.id) ?? 0) > 0,
      ).length;

      const primaryVariant = pVariants[0];
      const space = primaryVariant ? spaceByVariant.get(primaryVariant.id) ?? '' : '';
      const thumbnail = imageByProduct.get(p.id);

      return {
        id: p.id,
        nome: p.nome,
        sku_base: p.skuBase,
        sku: primaryVariant?.sku ?? p.skuBase ?? null,
        status: p.status,
        category: p.category,
        category_id: p.categoryId,
        supplier: p.supplier,
        supplier_id: p.supplierId,
        origem_integracao: p.origemIntegracao,
        criado_em: p.criadoEm,
        atualizado_em: p.atualizadoEm,
        thumbnail: thumbnail
          ? { url: thumbnail.url, alt_text: thumbnail.altText }
          : null,
        inventory: {
          total_available: totalAvailable,
          tracked: hasStock,
        },
        sales_channels: channels,
        markets: marketsWithStock,
        space,
        variant_count: pVariants.length,
      };
    });
  }
}