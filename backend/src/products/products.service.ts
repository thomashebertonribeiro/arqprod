import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import { UPLOADS_DIR } from '../uploads/uploads.controller';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductAttributeValue } from './product-attribute-value.entity';
import { ProductVariantAttributeValue } from './product-variant-attribute-value.entity';
import { ProductImage } from './product-image.entity';
import { Attribute } from '../attributes/attribute.entity';
import { StockItem } from '../stock/stock-item.entity';
import { Price } from '../prices/price.entity';
import { Brand } from '../brands/brand.entity';
import { Manufacturer } from '../manufacturers/manufacturer.entity';
import { ProductAudit } from './product-audit.entity';
import { User } from '../users/user.entity';
import { Tag } from '../tags/tag.entity';
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
    @InjectRepository(ProductAudit)
    private readonly audits: Repository<ProductAudit>,
    @InjectRepository(Tag)
    private readonly tags: Repository<Tag>,
    private readonly webhooks: WebhooksService,
    private readonly dataSource: DataSource,
  ) {}

  async create(orgId: string, dto: CreateProductDto, userId?: string) {
    const product = this.products.create({
      organizationId: orgId,
      nome: dto.nome,
      descricao: dto.descricao ?? null,
      skuBase: dto.sku_base ?? null,
      eanGtin: dto.ean_gtin ?? null,
      ncm: dto.ncm ?? null,
      cest: dto.cest ?? null,
      custo: dto.custo ?? null,
      categoryId: dto.category_id ?? null,
      supplierId: dto.supplier_id ?? null,
      brandId: dto.brand_id ?? null,
      manufacturerId: dto.manufacturer_id ?? null,
      pesoBrutoKg: dto.peso_bruto_kg ?? null,
      pesoLiquidoKg: dto.peso_liquido_kg ?? null,
      alturaCm: dto.altura_cm ?? null,
      larguraCm: dto.largura_cm ?? null,
      profundidadeCm: dto.profundidade_cm ?? null,
      unidadeVenda: dto.unidade_venda ?? null,
      dataLancamento: dto.data_lancamento ? new Date(dto.data_lancamento) : null,
      status: (dto.status as Product['status']) ?? 'rascunho',
      origemIntegracao: dto.origem_integracao ?? null,
      criadoPor: userId ?? null,
      atualizadoPor: userId ?? null,
    });
    const saved = await this.products.save(product);
    await this.recordAudit(orgId, saved.id, userId, 'created', { nome: saved.nome });
    this.webhooks.dispatch(orgId, 'product.created', { product_id: saved.id }).catch(() => undefined);
    return this.findOne(orgId, saved.id);
  }

  async findOne(orgId: string, id: string) {
    const product = await this.products.findOne({
      where: { id, organizationId: orgId },
      relations: {
        category: true,
        supplier: true,
        brand: true,
        manufacturer: true,
        criadoPorUser: true,
        atualizadoPorUser: true,
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
      ean_gtin: base.eanGtin,
      ncm: base.ncm,
      cest: base.cest,
      custo: base.custo,
      brand: base.brand,
      brand_id: base.brandId,
      manufacturer: base.manufacturer,
      manufacturer_id: base.manufacturerId,
      unidade_venda: base.unidadeVenda,
      data_lancamento: base.dataLancamento,
      peso_bruto_kg: base.pesoBrutoKg,
      peso_liquido_kg: base.pesoLiquidoKg,
      altura_cm: base.alturaCm,
      largura_cm: base.larguraCm,
      profundidade_cm: base.profundidadeCm,
      cubagem_m3: computeCubagem(base.alturaCm, base.larguraCm, base.profundidadeCm),
      criado_por: base.criadoPor,
      atualizado_por: base.atualizadoPor,
      criado_por_nome: base.criadoPorUser?.nome ?? null,
      atualizado_por_nome: base.atualizadoPorUser?.nome ?? null,
      atributos: base.atributos,
      origem_integracao: base.origemIntegracao,
      ml_readiness_score: base.mlReadinessScore,
      ml_listings_count: base.mlListingsCount,
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

  async update(orgId: string, id: string, dto: UpdateProductDto, userId?: string) {
    const product = await this.getOwned(orgId, id);
    if (dto.nome !== undefined) product.nome = dto.nome;
    if (dto.descricao !== undefined) product.descricao = dto.descricao ?? null;
    if (dto.ean_gtin !== undefined) product.eanGtin = dto.ean_gtin ?? null;
    if (dto.ncm !== undefined) product.ncm = dto.ncm ?? null;
    if (dto.cest !== undefined) product.cest = dto.cest ?? null;
    if (dto.custo !== undefined) product.custo = dto.custo ?? null;
    if (dto.category_id !== undefined) product.categoryId = dto.category_id || null;
    if (dto.supplier_id !== undefined) product.supplierId = dto.supplier_id || null;
    if (dto.brand_id !== undefined) product.brandId = dto.brand_id || null;
    if (dto.manufacturer_id !== undefined) product.manufacturerId = dto.manufacturer_id || null;
    if (dto.peso_bruto_kg !== undefined) product.pesoBrutoKg = dto.peso_bruto_kg ?? null;
    if (dto.peso_liquido_kg !== undefined) product.pesoLiquidoKg = dto.peso_liquido_kg ?? null;
    if (dto.altura_cm !== undefined) product.alturaCm = dto.altura_cm ?? null;
    if (dto.largura_cm !== undefined) product.larguraCm = dto.largura_cm ?? null;
    if (dto.profundidade_cm !== undefined) product.profundidadeCm = dto.profundidade_cm ?? null;
    if (dto.unidade_venda !== undefined) product.unidadeVenda = dto.unidade_venda ?? null;
    if (dto.data_lancamento !== undefined)
      product.dataLancamento = dto.data_lancamento ? new Date(dto.data_lancamento) : null;
    if (dto.status !== undefined) product.status = dto.status as Product['status'];
    if (userId) product.atualizadoPor = userId;
    await this.products.save(product);
    await this.recordAudit(orgId, id, userId, 'updated', { nome: product.nome });
    this.webhooks.dispatch(orgId, 'product.updated', { product_id: id }).catch(() => undefined);
    return this.findOne(orgId, id);
  }

  async remove(orgId: string, id: string, userId?: string) {
    const product = await this.getOwned(orgId, id);
    await this.recordAudit(orgId, id, userId, 'deleted', { nome: product.nome });
    await this.products.delete(product.id);
    this.webhooks.dispatch(orgId, 'product.deleted', { product_id: id }).catch(() => undefined);
    return { id: product.id };
  }

  private async recordAudit(
    orgId: string,
    productId: string,
    userId: string | undefined,
    acao: ProductAudit['acao'],
    detalhes?: Record<string, unknown>,
  ) {
    try {
      await this.audits.save(
        this.audits.create({
          productId,
          userId: userId ?? null,
          acao,
          detalhes: detalhes ?? null,
        }),
      );
    } catch {
      // auditoria é best-effort — nunca deve derrubar a operação principal
    }
  }

  async duplicate(orgId: string, id: string, userId?: string) {
    const source = await this.findOne(orgId, id);
    const copy = this.products.create({
      organizationId: orgId,
      nome: `${source.nome} (cópia)`,
      descricao: source.descricao,
      skuBase: source.skuBase ? `${source.skuBase}-COPY` : null,
      eanGtin: null,
      ncm: source.ncm,
      cest: source.cest,
      custo: source.custo,
      categoryId: source.categoryId,
      supplierId: source.supplierId,
      brandId: source.brandId,
      manufacturerId: source.manufacturerId,
      pesoBrutoKg: source.pesoBrutoKg,
      pesoLiquidoKg: source.pesoLiquidoKg,
      alturaCm: source.alturaCm,
      larguraCm: source.larguraCm,
      profundidadeCm: source.profundidadeCm,
      unidadeVenda: source.unidadeVenda,
      dataLancamento: source.dataLancamento,
      status: 'rascunho',
      origemIntegracao: null,
      criadoPor: userId ?? null,
      atualizadoPor: userId ?? null,
      tags: source.tags ?? [],
    });
    const saved = await this.products.save(copy);

    for (const v of source.variants ?? []) {
      await this.variants.save(
        this.variants.create({
          productId: saved.id,
          sku: `${v.sku}-COPY`,
          eanGtin: null,
          combinacao: v.combinacao,
          pesoKg: v.pesoKg,
          dimensoes: v.dimensoes,
          status: 'inativo',
        }),
      );
    }
    for (const img of source.images ?? []) {
      await this.images.save(
        this.images.create({
          productId: saved.id,
          url: img.url,
          ordem: img.ordem,
          altText: img.altText,
        }),
      );
    }
    await this.recordAudit(orgId, saved.id, userId, 'duplicated', { from: id });
    await this.recordAudit(orgId, id, userId, 'duplicated', { to: saved.id });
    this.webhooks.dispatch(orgId, 'product.created', { product_id: saved.id }).catch(() => undefined);
    return this.findOneEnriched(orgId, saved.id);
  }

  async addTags(orgId: string, productId: string, nomes: string[], userId?: string) {
    const product = await this.getOwned(orgId, productId);
    const existing = await this.tags.find({ where: { organizationId: orgId } });
    const byName = new Map(existing.map((t) => [t.nome.toLowerCase(), t]));
    const current = new Set((product.tags ?? []).map((t) => t.nome.toLowerCase()));

    const toLink: Tag[] = [];
    for (const nome of nomes) {
      const key = nome.trim().toLowerCase();
      if (!key || current.has(key)) continue;
      const found = byName.get(key);
      if (found) {
        toLink.push(found);
        current.add(key);
      } else {
        const tag = await this.tags.save(this.tags.create({ organizationId: orgId, nome: nome.trim() }));
        toLink.push(tag);
        byName.set(key, tag);
        current.add(key);
      }
    }
    if (toLink.length) {
      product.tags = [...(product.tags ?? []), ...toLink];
      await this.products.save(product);
      await this.recordAudit(
        orgId,
        productId,
        userId,
        'tag_added',
        { tags: toLink.map((t) => t.nome) },
      );
    }
    return this.findOneEnriched(orgId, productId);
  }

  async removeTag(orgId: string, productId: string, tagId: string, userId?: string) {
    const product = await this.getOwned(orgId, productId);
    const tag = (product.tags ?? []).find((t) => t.id === tagId);
    if (!tag) throw new NotFoundException('Tag não vinculada a este produto');
    product.tags = (product.tags ?? []).filter((t) => t.id !== tagId);
    await this.products.save(product);
    await this.recordAudit(orgId, productId, userId, 'tag_removed', { tag: tag.nome });
    return this.findOneEnriched(orgId, productId);
  }

  async listAudits(orgId: string, productId: string) {
    await this.getOwned(orgId, productId);
    const rows = await this.audits.find({
      where: { productId },
      relations: { user: true },
      order: { criadoEm: 'DESC' },
      take: 100,
    });
    return {
      data: rows.map((r) => ({
        id: r.id,
        acao: r.acao,
        detalhes: r.detalhes,
        criado_em: r.criadoEm,
        usuario: r.user ? { id: r.user.id, nome: r.user.nome } : null,
      })),
    };
  }

  async importCsv(orgId: string, file?: Express.Multer.File, userId?: string) {
    if (!file?.buffer) throw new BadRequestException('Envie um arquivo CSV no campo "file"');
    const text = file.buffer.toString('utf8');
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (lines.length < 2) throw new BadRequestException('CSV vazio (precisa de cabeçalho + dados)');
    const headers = parseCsvLine(lines[0]);
    const idx = (name: string) => headers.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());

    const col = {
      nome: idx('nome'),
      sku: idx('sku') >= 0 ? idx('sku') : idx('sku_base'),
      ean: idx('ean') >= 0 ? idx('ean') : idx('ean_gtin'),
      ncm: idx('ncm'),
      cest: idx('cest'),
      custo: idx('custo'),
      descricao: idx('descricao'),
      status: idx('status'),
      categoria: idx('categoria'),
      marca: idx('marca'),
      fabricante: idx('fabricante'),
      unidade: idx('unidade_venda'),
      data_lancamento: idx('data_lancamento'),
      peso_bruto: idx('peso_bruto_kg'),
      peso_liquido: idx('peso_liquido_kg'),
      altura: idx('altura_cm'),
      largura: idx('largura_cm'),
      profundidade: idx('profundidade_cm'),
    };
    if (col.nome < 0) throw new BadRequestException('Coluna obrigatória ausente: "nome"');

    const categories = await this.dataSource.query(
      `SELECT id, nome FROM categories WHERE organization_id = $1`,
      [orgId],
    );
    const catByName = new Map<string, string>((categories as { id: string; nome: string }[]).map((c) => [c.nome.trim().toLowerCase(), c.id]));
    const brands = await this.dataSource.query(
      `SELECT id, nome FROM brands WHERE organization_id = $1`,
      [orgId],
    );
    const brandByName = new Map<string, string>((brands as { id: string; nome: string }[]).map((b) => [b.nome.trim().toLowerCase(), b.id]));
    const manufacturers = await this.dataSource.query(
      `SELECT id, nome FROM manufacturers WHERE organization_id = $1`,
      [orgId],
    );
    const mfrByName = new Map<string, string>((manufacturers as { id: string; nome: string }[]).map((m) => [m.nome.trim().toLowerCase(), m.id]));

    const created: string[] = [];
    const updated: string[] = [];
    const skipped: string[] = [];

    for (const line of lines.slice(1)) {
      const fields = parseCsvLine(line);
      const get = (i: number) => (i >= 0 ? (fields[i] ?? '').trim() : '');
      const nome = get(col.nome);
      if (!nome) {
        skipped.push('(linha sem nome)');
        continue;
      }
      const sku = get(col.sku);
      const dataLancamento = get(col.data_lancamento) ? new Date(get(col.data_lancamento)) : null;

      let existing: Product | null = null;
      if (sku) {
        existing = await this.products.findOne({ where: { organizationId: orgId, skuBase: sku } });
      }

      const payload = {
        nome,
        descricao: get(col.descricao) || null,
        skuBase: sku || null,
        eanGtin: get(col.ean) || null,
        ncm: get(col.ncm) || null,
        cest: get(col.cest) || null,
        custo: get(col.custo) || null,
        categoria: get(col.categoria),
        marca: get(col.marca),
        fabricante: get(col.fabricante),
        unidadeVenda: get(col.unidade) || null,
        dataLancamento,
        pesoBrutoKg: get(col.peso_bruto) || null,
        pesoLiquidoKg: get(col.peso_liquido) || null,
        alturaCm: get(col.altura) || null,
        larguraCm: get(col.largura) || null,
        profundidadeCm: get(col.profundidade) || null,
        status: (get(col.status) || 'rascunho') as Product['status'],
      };

      const categoryId = payload.categoria ? catByName.get(payload.categoria.toLowerCase()) ?? null : null;
      const brandId = payload.marca ? brandByName.get(payload.marca.toLowerCase()) ?? null : null;
      const manufacturerId = payload.fabricante ? mfrByName.get(payload.fabricante.toLowerCase()) ?? null : null;

      if (existing) {
        existing.nome = payload.nome;
        existing.descricao = payload.descricao;
        existing.skuBase = payload.skuBase;
        existing.eanGtin = payload.eanGtin;
        existing.ncm = payload.ncm;
        existing.cest = payload.cest;
        existing.custo = payload.custo;
        existing.categoryId = categoryId;
        existing.brandId = brandId;
        existing.manufacturerId = manufacturerId;
        existing.unidadeVenda = payload.unidadeVenda;
        existing.dataLancamento = payload.dataLancamento;
        existing.pesoBrutoKg = payload.pesoBrutoKg;
        existing.pesoLiquidoKg = payload.pesoLiquidoKg;
        existing.alturaCm = payload.alturaCm;
        existing.larguraCm = payload.larguraCm;
        existing.profundidadeCm = payload.profundidadeCm;
        existing.status = payload.status;
        if (userId) existing.atualizadoPor = userId;
        await this.products.save(existing);
        await this.recordAudit(orgId, existing.id, userId, 'updated', { origem: 'csv_import' });
        updated.push(nome);
      } else {
        const createdProduct = this.products.create({
          organizationId: orgId,
          nome: payload.nome,
          descricao: payload.descricao,
          skuBase: payload.skuBase,
          eanGtin: payload.eanGtin,
          ncm: payload.ncm,
          cest: payload.cest,
          custo: payload.custo,
          categoryId,
          brandId,
          manufacturerId,
          unidadeVenda: payload.unidadeVenda,
          dataLancamento: payload.dataLancamento,
          pesoBrutoKg: payload.pesoBrutoKg,
          pesoLiquidoKg: payload.pesoLiquidoKg,
          alturaCm: payload.alturaCm,
          larguraCm: payload.larguraCm,
          profundidadeCm: payload.profundidadeCm,
          status: payload.status,
          criadoPor: userId ?? null,
          atualizadoPor: userId ?? null,
        });
        const saved = await this.products.save(createdProduct);
        await this.recordAudit(orgId, saved.id, userId, 'created', { origem: 'csv_import' });
        created.push(nome);
      }
    }

    return {
      created: created.length,
      updated: updated.length,
      skipped: skipped.length,
    };
  }

  async addVariant(orgId: string, productId: string, dto: CreateVariantDto, userId?: string) {
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
    await this.recordAudit(orgId, productId, userId, 'variant_created', { variant_id: saved.id, sku: saved.sku });
    this.webhooks.dispatch(orgId, 'variant.created', { variant_id: saved.id, product_id: product.id }).catch(() => undefined);
    return saved;
  }

  async updateVariant(orgId: string, productId: string, variantId: string, dto: UpdateVariantDto, userId?: string) {
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
    await this.recordAudit(orgId, productId, userId, 'variant_updated', { variant_id: variant.id, sku: variant.sku });
    return variant;
  }

  async removeVariant(orgId: string, productId: string, variantId: string, userId?: string) {
    const product = await this.getOwned(orgId, productId);
    const variant = await this.variants.findOne({
      where: { id: variantId, productId: product.id },
    });
    if (!variant) throw new NotFoundException('Variação não encontrada');

    await this.variants.delete(variant.id);
    await this.rebuildAttributesCache(product);
    await this.recordAudit(orgId, productId, userId, 'variant_deleted', { variant_id: variant.id, sku: variant.sku });
    return { id: variant.id };
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
    await this.recordAudit(
      orgId,
      product.id,
      userId,
      'attribute_values_saved',
      { atributos: dto.valores.map((v) => v.atributo) },
    );
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

  async addImage(orgId: string, productId: string, dto: { url: string; ordem?: number; alt_text?: string }, userId?: string) {
    const product = await this.getOwned(orgId, productId);
    const row = await this.images.save(
      this.images.create({
        productId: product.id,
        url: dto.url,
        ordem: dto.ordem ?? 0,
        altText: dto.alt_text ?? null,
      }),
    );
    await this.recordAudit(orgId, productId, userId, 'image_added', { url: dto.url });
    return row;
  }

  async uploadImage(orgId: string, productId: string, file?: Express.Multer.File, userId?: string) {
    const product = await this.getOwned(orgId, productId);
    if (!file?.buffer) throw new BadRequestException('Envie um arquivo no campo "file"');
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      throw new BadRequestException('Formato inválido: use JPEG ou PNG');
    }
    const meta = await sharp(file.buffer)
      .metadata()
      .catch(() => null);
    if (!meta) throw new BadRequestException('Arquivo de imagem inválido ou corrompido');
    if (meta.width !== 1200 || meta.height !== 1200) {
      throw new BadRequestException(
        `Dimensões devem ser exatamente 1200x1200px (recebido: ${meta.width ?? '?'}x${meta.height ?? '?'})`,
      );
    }
    if (meta.space !== 'srgb') {
      throw new BadRequestException(
        `Imagem deve estar no espaço de cor RGB (recebido: ${meta.space ?? 'desconhecido'})`,
      );
    }
    const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
    const filename = `${randomUUID()}.${ext}`;
    await mkdir(UPLOADS_DIR, { recursive: true });
    await writeFile(join(UPLOADS_DIR, filename), file.buffer);
    const row = await this.images.save(
      this.images.create({
        productId: product.id,
        url: `/api/uploads/${filename}`,
        ordem: 0,
      }),
    );
    await this.recordAudit(orgId, productId, userId, 'image_added', { url: row.url });
    this.webhooks.dispatch(orgId, 'product.updated', { product_id: product.id }).catch(() => undefined);
    return row;
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
        ean_gtin: p.eanGtin ?? primaryVariant?.eanGtin ?? null,
        ncm: p.ncm,
        cest: p.cest,
        custo: p.custo,
        descricao: p.descricao,
        status: p.status,
        category: p.category,
        category_id: p.categoryId,
        supplier: p.supplier,
        supplier_id: p.supplierId,
        brand: p.brand,
        brand_id: p.brandId,
        manufacturer: p.manufacturer,
        manufacturer_id: p.manufacturerId,
        unidade_venda: p.unidadeVenda,
        data_lancamento: p.dataLancamento,
        peso_bruto_kg: p.pesoBrutoKg,
        peso_liquido_kg: p.pesoLiquidoKg,
        altura_cm: p.alturaCm,
        largura_cm: p.larguraCm,
        profundidade_cm: p.profundidadeCm,
        cubagem_m3: computeCubagem(p.alturaCm, p.larguraCm, p.profundidadeCm),
        criado_por: p.criadoPor,
        atualizado_por: p.atualizadoPor,
        origem_integracao: p.origemIntegracao,
        ml_readiness_score: p.mlReadinessScore,
        ml_listings_count: p.mlListingsCount,
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

function computeCubagem(
  altura: string | null,
  largura: string | null,
  profundidade: string | null,
): string | null {
  if (!altura || !largura || !profundidade) return null;
  const h = Number(altura);
  const l = Number(largura);
  const p = Number(profundidade);
  if ([h, l, p].some((n) => Number.isNaN(n) || n <= 0)) return null;
  return ((h * l * p) / 1_000_000).toFixed(6);
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}