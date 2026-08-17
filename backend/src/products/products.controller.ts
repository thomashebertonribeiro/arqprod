import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductsService } from './products.service';
import { CurrentIdentity } from '../common/auth/current-identity.decorator';
import { paginate, withPagination } from '../common/pagination';
import {
  CreateImageDto,
  CreateProductDto,
  CreateVariantDto,
  SaveAttributeValuesDto,
  UpdateProductDto,
  UpdateVariantDto,
} from './dto';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(
    private readonly service: ProductsService,
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variants: Repository<ProductVariant>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar produto' })
  create(
    @CurrentIdentity() identity: { orgId: string },
    @Body() dto: CreateProductDto,
  ) {
    return this.service.create(identity.orgId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar produtos com agregados (estoque, canais, mercado, espaço, vendor)',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'per_page', required: false, example: 20 })
  @ApiQuery({ name: 'category_id', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['rascunho', 'ativo', 'inativo', 'descontinuado'] })
  @ApiQuery({ name: 'q', required: false, description: 'Busca por nome ou SKU' })
  @ApiQuery({ name: 'updated_since', required: false, description: 'ISO date — filtra por atualizado_em' })
  async list(
    @CurrentIdentity() identity: { orgId: string },
    @Query('category_id') categoryId?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('updated_since') updatedSince?: string,
    @Query() query: Record<string, string> = {},
  ) {
    const { skip, take, page, perPage } = withPagination(query, 1, 20);
    const qb = this.products
      .createQueryBuilder('p')
      .where('p.organization_id = :orgId', { orgId: identity.orgId });

    if (categoryId) qb.andWhere('p.category_id = :categoryId', { categoryId });
    if (status) qb.andWhere('p.status = :status', { status });
    if (updatedSince) qb.andWhere('p.atualizado_em >= :since', { since: new Date(updatedSince) });
    if (q) {
      qb.andWhere(
        '(p.nome ILIKE :q OR p.sku_base ILIKE :q OR EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.sku ILIKE :q))',
        { q: `%${q}%` },
      );
    }

    const total = await qb.getCount();
    const ids = (
      await qb
        .clone()
        .select('p.id', 'id')
        .orderBy('p.atualizado_em', 'DESC')
        .skip(skip)
        .take(take)
        .getRawMany<{ id: string }>()
    ).map((r) => r.id);

    const rows = ids.length
      ? await this.products.find({
          where: { id: In(ids) },
          relations: { category: true, supplier: true },
        })
      : [];
    const enriched = await this.service.enrich(identity.orgId, rows);
    return paginate(enriched, total, page, perPage);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalhe do produto',
    description:
      'Mesmo shape da listagem (agregados incluídos) + descricao, imagens, tags, valores de atributos e variações.',
  })
  findOne(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    return this.service.findOneEnriched(identity.orgId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar produto' })
  async update(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    await this.service.update(identity.orgId, id, dto);
    return this.service.findOneEnriched(identity.orgId, id);
  }

  // ------------------------------------------------------------- attribute values
  @Get(':id/attribute-values')
  @ApiOperation({ summary: 'Valores dos atributos de nível produto' })
  getAttributeValues(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    return this.service.getProductAttributeValues(identity.orgId, id);
  }

  @Post(':id/attribute-values')
  @ApiOperation({
    summary: 'Salvar valores de atributos de nível produto',
    description:
      'Cada item: { "atributo": "chave_ou_id", "valor": ... }. Atributos de nível variação são rejeitados aqui.',
  })
  saveAttributeValues(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
    @Body() dto: SaveAttributeValuesDto,
  ) {
    return this.service.saveProductAttributeValues(identity.orgId, id, dto, identity.userId);
  }

  @Patch(':id/attribute-values')
  @ApiOperation({ summary: 'Atualizar valores de atributos de nível produto' })
  patchAttributeValues(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
    @Body() dto: SaveAttributeValuesDto,
  ) {
    return this.service.saveProductAttributeValues(identity.orgId, id, dto, identity.userId);
  }

  // ------------------------------------------------------------- variants
  @Get(':id/variants')
  @ApiOperation({ summary: 'Variações do produto' })
  async listVariants(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    await this.service.getOwned(identity.orgId, id);
    const rows = await this.variants.find({
      where: { productId: id },
      order: { criadoEm: 'ASC' },
    });
    return { data: rows };
  }

  @Post(':id/variants')
  @ApiOperation({ summary: 'Criar variação (ex: Camisa Azul Tamanho M)' })
  addVariant(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.service.addVariant(identity.orgId, id, dto);
  }

  @Patch(':id/variants/:variantId')
  @ApiOperation({ summary: 'Atualizar variação' })
  updateVariant(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.service.updateVariant(identity.orgId, id, variantId, dto);
  }

  @Get(':id/variants/:variantId/attribute-values')
  @ApiOperation({ summary: 'Valores de atributos de nível variação' })
  getVariantAttributeValues(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
    @Param('variantId') variantId: string,
  ) {
    return this.service.getVariantAttributeValues(identity.orgId, id, variantId);
  }

  @Post(':id/variants/:variantId/attribute-values')
  @ApiOperation({
    summary: 'Salvar valores de atributos de nível variação',
    description: 'Atributos de nível produto são rejeitados aqui.',
  })
  saveVariantAttributeValues(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: SaveAttributeValuesDto,
  ) {
    return this.service.saveVariantAttributeValues(identity.orgId, id, variantId, dto);
  }

  // ------------------------------------------------------------- images
  @Post(':id/images')
  @ApiOperation({ summary: 'Adicionar imagem ao produto' })
  addImage(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
    @Body() dto: CreateImageDto,
  ) {
    return this.service.addImage(identity.orgId, id, dto);
  }
}
