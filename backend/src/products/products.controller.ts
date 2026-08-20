import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Response } from 'express';
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
  SetTagsDto,
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
  async create(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Body() dto: CreateProductDto,
  ) {
    const created = await this.service.create(identity.orgId, dto, identity.userId);
    return this.service.findOneEnriched(identity.orgId, created.id);
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
          relations: { category: true, supplier: true, brand: true, manufacturer: true },
        })
      : [];
    const enriched = await this.service.enrich(identity.orgId, rows);
    return paginate(enriched, total, page, perPage);
  }

  @Post('import')
  @ApiOperation({
    summary: 'Importar produtos via CSV (multipart, campo "file")',
    description:
      'Cabeçalho: nome, sku, ean, ncm, cest, custo, descricao, status, categoria, marca, fabricante, unidade_venda, data_lancamento, peso_bruto_kg, peso_liquido_kg, altura_cm, largura_cm, profundidade_cm. Linhas com o mesmo sku atualizam o produto existente.',
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  importCsv(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.importCsv(identity.orgId, file, identity.userId);
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportar produtos em CSV' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="produtos.csv"')
  async exportCsv(
    @CurrentIdentity() identity: { orgId: string },
    @Res() res: Response,
  ) {
    const rows = await this.products.find({
      where: { organizationId: identity.orgId },
      relations: { category: true, supplier: true, brand: true, manufacturer: true },
      order: { atualizadoEm: 'DESC' },
    });
    const enriched = await this.service.enrich(identity.orgId, rows);

    const headers = [
      'nome',
      'sku',
      'ean_gtin',
      'ncm',
      'cest',
      'custo',
      'descricao',
      'status',
      'categoria',
      'marca',
      'fabricante',
      'fornecedor',
      'unidade_venda',
      'data_lancamento',
      'peso_bruto_kg',
      'peso_liquido_kg',
      'altura_cm',
      'largura_cm',
      'profundidade_cm',
    ];
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(','),
      ...enriched.map((p) =>
        [
          esc(p.nome),
          esc(p.sku),
          esc(p.ean_gtin),
          esc(p.ncm),
          esc(p.cest),
          esc(p.custo),
          esc(p.descricao),
          esc(p.status),
          esc((p.category as { nome?: string } | null)?.nome ?? ''),
          esc((p.brand as { nome?: string } | null)?.nome ?? ''),
          esc((p.manufacturer as { nome?: string } | null)?.nome ?? ''),
          esc((p.supplier as { nome?: string } | null)?.nome ?? ''),
          esc(p.unidade_venda),
          esc(p.data_lancamento ? new Date(p.data_lancamento as string).toISOString() : ''),
          esc(p.peso_bruto_kg),
          esc(p.peso_liquido_kg),
          esc(p.altura_cm),
          esc(p.largura_cm),
          esc(p.profundidade_cm),
        ].join(','),
      ),
    ];
    res.send('\uFEFF' + lines.join('\n'));
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
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    await this.service.update(identity.orgId, id, dto, identity.userId);
    return this.service.findOneEnriched(identity.orgId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir produto (cascade em variações, valores, imagens)' })
  async remove(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
  ) {
    return this.service.remove(identity.orgId, id, identity.userId);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicar produto (cópia com variantes, imagens e tags)' })
  duplicate(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
  ) {
    return this.service.duplicate(identity.orgId, id, identity.userId);
  }

  @Post(':id/tags')
  @ApiOperation({ summary: 'Vincular tags ao produto (cria tags inexistentes)' })
  addTags(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
    @Body() dto: SetTagsDto,
  ) {
    return this.service.addTags(identity.orgId, id, dto.tags, identity.userId);
  }

  @Delete(':id/tags/:tagId')
  @ApiOperation({ summary: 'Remover tag do produto' })
  removeTag(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
    @Param('tagId') tagId: string,
  ) {
    return this.service.removeTag(identity.orgId, id, tagId, identity.userId);
  }

  @Get(':id/audits')
  @ApiOperation({ summary: 'Histórico de alterações do produto' })
  audits(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    return this.service.listAudits(identity.orgId, id);
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
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.service.addVariant(identity.orgId, id, dto, identity.userId);
  }

  @Patch(':id/variants/:variantId')
  @ApiOperation({ summary: 'Atualizar variação' })
  updateVariant(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.service.updateVariant(identity.orgId, id, variantId, dto, identity.userId);
  }

  @Delete(':id/variants/:variantId')
  @ApiOperation({
    summary: 'Excluir variação (cascade em preços, estoques e valores de atributos)',
  })
  removeVariant(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
    @Param('variantId') variantId: string,
  ) {
    return this.service.removeVariant(identity.orgId, id, variantId, identity.userId);
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
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
    @Body() dto: CreateImageDto,
  ) {
    return this.service.addImage(identity.orgId, id, dto, identity.userId);
  }

  @Post(':id/images/upload')
  @ApiOperation({
    summary: 'Upload de imagem (multipart, campo "file")',
    description:
      'Aceita apenas JPEG ou PNG, exatamente 1200x1200px, espaço de cor RGB. ' +
      'A imagem é armazenada localmente e servida em /api/uploads/{arquivo}.',
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 12 * 1024 * 1024 } }),
  )
  uploadImage(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.uploadImage(identity.orgId, id, file, identity.userId);
  }
}
