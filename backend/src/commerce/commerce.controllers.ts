import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { Repository } from 'typeorm';
import { CurrentIdentity } from '../common/auth/current-identity.decorator';
import { Channel } from '../channels/channel.entity';
import { Price } from '../prices/price.entity';
import { Warehouse } from '../warehouses/warehouse.entity';
import { StockItem } from '../stock/stock-item.entity';
import { Supplier } from '../suppliers/supplier.entity';

// ---------------------------------------------------------------- DTOs

export class CreateChannelDto {
  @ApiProperty({ example: 'Loja própria' })
  @IsString()
  @MaxLength(255)
  nome: string;

  @ApiPropertyOptional({ enum: ['site_proprio', 'marketplace', 'atacado', 'revenda'], default: 'site_proprio' })
  @IsOptional()
  @IsIn(['site_proprio', 'marketplace', 'atacado', 'revenda'])
  tipo?: string;
}

export class SetPriceDto {
  @ApiProperty({ example: 'uuid-da-variacao' })
  @IsString()
  product_variant_id: string;

  @ApiProperty({ example: 'BRL' })
  @IsString()
  @MaxLength(3)
  moeda: string;

  @ApiProperty({ example: 199.9 })
  @IsNumber()
  valor: number;

  @ApiPropertyOptional({ example: 149.9 })
  @IsOptional()
  @IsNumber()
  valor_promocional?: number;
}

export class CreateWarehouseDto {
  @ApiProperty({ example: 'CD São Paulo' })
  @IsString()
  @MaxLength(255)
  nome: string;

  @ApiPropertyOptional({
    example: { cidade: 'São Paulo', uf: 'SP', cep: '01000-000' },
  })
  @IsOptional()
  endereco?: Record<string, unknown>;
}

export class SetStockDto {
  @ApiProperty({ example: 'uuid-da-variacao' })
  @IsString()
  product_variant_id: string;

  @ApiProperty({ example: 'uuid-do-warehouse' })
  @IsString()
  warehouse_id: string;

  @ApiProperty({ example: 25 })
  @IsNumber()
  quantidade: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  reservado?: number;
}

export class CreateSupplierDto {
  @ApiProperty({ example: 'Distribuidora Nacional Ltda' })
  @IsString()
  @MaxLength(255)
  nome: string;

  @ApiPropertyOptional({ example: { email: 'vendas@distribuidora.com' } })
  @IsOptional()
  contato?: Record<string, unknown>;
}

// ---------------------------------------------------------------- Controllers

@ApiTags('channels')
@ApiBearerAuth()
@Controller('channels')
export class ChannelsController {
  constructor(
    @InjectRepository(Channel)
    private readonly channels: Repository<Channel>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar canal de venda' })
  create(@CurrentIdentity() identity: { orgId: string }, @Body() dto: CreateChannelDto) {
    return this.channels.save(
      this.channels.create({
        organizationId: identity.orgId,
        nome: dto.nome,
        tipo: (dto.tipo as Channel['tipo']) ?? 'site_proprio',
      }),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar canais de venda' })
  async list(@CurrentIdentity() identity: { orgId: string }) {
    const rows = await this.channels.find({
      where: { organizationId: identity.orgId },
      order: { nome: 'ASC' },
    });
    return { data: rows };
  }
}

@ApiTags('prices')
@ApiBearerAuth()
@Controller('prices')
export class PricesController {
  constructor(
    @InjectRepository(Price)
    private readonly prices: Repository<Price>,
    @InjectRepository(Channel)
    private readonly channels: Repository<Channel>,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Definir preço de uma variação em um canal',
    description:
      'Forma alternativa: informe channel_id no corpo. Prefira POST /prices/:channelId/variants/:variantId.',
  })
  async setPrice(
    @CurrentIdentity() identity: { orgId: string },
    @Body() dto: SetPriceDto & { channel_id?: string },
  ) {
    if (!dto.channel_id) {
      throw new NotFoundException(
        'Informe channel_id no corpo ou use POST /prices/:channelId/variants/:variantId',
      );
    }
    const channel = await this.channels.findOne({
      where: { id: dto.channel_id, organizationId: identity.orgId },
    });
    if (!channel) throw new NotFoundException('Canal não encontrado');

    const existing = await this.prices.findOne({
      where: {
        productVariantId: dto.product_variant_id,
        channelId: dto.channel_id,
        moeda: dto.moeda,
      },
    });
    const price = existing ?? this.prices.create({
      productVariantId: dto.product_variant_id,
      channelId: dto.channel_id,
      moeda: dto.moeda,
    });
    price.valor = String(dto.valor);
    price.valorPromocional = dto.valor_promocional != null ? String(dto.valor_promocional) : null;
    return this.prices.save(price);
  }

  @Post(':channelId/variants/:variantId')
  @ApiOperation({ summary: 'Definir preço de variação no canal' })
  async setPriceForVariant(
    @CurrentIdentity() identity: { orgId: string },
    @Param('channelId') channelId: string,
    @Param('variantId') variantId: string,
    @Body() dto: Omit<SetPriceDto, 'product_variant_id'>,
  ) {
    const channel = await this.channels.findOne({
      where: { id: channelId, organizationId: identity.orgId },
    });
    if (!channel) throw new NotFoundException('Canal não encontrado');

    const existing = await this.prices.findOne({
      where: { productVariantId: variantId, channelId, moeda: dto.moeda },
    });
    const price = existing ?? this.prices.create({ productVariantId: variantId, channelId, moeda: dto.moeda });
    price.valor = String(dto.valor);
    price.valorPromocional = dto.valor_promocional != null ? String(dto.valor_promocional) : null;
    price.promocaoInicio = null;
    price.promocaoFim = null;
    return this.prices.save(price);
  }

  @Get('variant/:variantId')
  @ApiOperation({ summary: 'Preços de uma variação (todos os canais)' })
  async byVariant(
    @CurrentIdentity() identity: { orgId: string },
    @Param('variantId') variantId: string,
  ) {
    const rows = await this.prices.find({
      where: { productVariantId: variantId },
      relations: { channel: true },
    });
    return { data: rows.filter((p) => p.channel?.organizationId === identity.orgId) };
  }
}

@ApiTags('warehouses')
@ApiBearerAuth()
@Controller('warehouses')
export class WarehousesController {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouses: Repository<Warehouse>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar armazém' })
  create(@CurrentIdentity() identity: { orgId: string }, @Body() dto: CreateWarehouseDto) {
    return this.warehouses.save(
      this.warehouses.create({
        organizationId: identity.orgId,
        nome: dto.nome,
        endereco: dto.endereco ?? null,
      }),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar armazéns' })
  async list(@CurrentIdentity() identity: { orgId: string }) {
    const rows = await this.warehouses.find({
      where: { organizationId: identity.orgId },
      order: { nome: 'ASC' },
    });
    return { data: rows };
  }
}

@ApiTags('stock')
@ApiBearerAuth()
@Controller('stock')
export class StockController {
  constructor(
    @InjectRepository(StockItem)
    private readonly stock: Repository<StockItem>,
    @InjectRepository(Warehouse)
    private readonly warehouses: Repository<Warehouse>,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Definir estoque de variação em armazém',
    description: 'disponivel = quantidade - reservado (calculado, nunca armazenado).',
  })
  async setStock(
    @CurrentIdentity() identity: { orgId: string },
    @Body() dto: SetStockDto,
  ) {
    const warehouse = await this.warehouses.findOne({
      where: { id: dto.warehouse_id, organizationId: identity.orgId },
    });
    if (!warehouse) throw new NotFoundException('Armazém não encontrado');

    const existing = await this.stock.findOne({
      where: { productVariantId: dto.product_variant_id, warehouseId: dto.warehouse_id },
    });
    const item = existing ?? this.stock.create({
      productVariantId: dto.product_variant_id,
      warehouseId: dto.warehouse_id,
    });
    item.quantidade = dto.quantidade;
    item.reservado = dto.reservado ?? 0;
    item.atualizadoEm = new Date();
    return this.stock.save(item);
  }

  @Get('variant/:variantId')
  @ApiOperation({ summary: 'Estoque de uma variação (todos os armazéns)' })
  async byVariant(
    @CurrentIdentity() identity: { orgId: string },
    @Param('variantId') variantId: string,
  ) {
    const rows = await this.stock.find({
      where: { productVariantId: variantId },
      relations: { warehouse: true },
    });
    const filtered = rows.filter((r) => r.warehouse?.organizationId === identity.orgId);
    return {
      data: filtered.map((r) => ({
        ...r,
        disponivel: r.quantidade - r.reservado,
      })),
    };
  }
}

@ApiTags('suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliers: Repository<Supplier>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar fornecedor' })
  create(@CurrentIdentity() identity: { orgId: string }, @Body() dto: CreateSupplierDto) {
    return this.suppliers.save(
      this.suppliers.create({
        organizationId: identity.orgId,
        nome: dto.nome,
        contato: dto.contato ?? null,
      }),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar fornecedores' })
  async list(@CurrentIdentity() identity: { orgId: string }) {
    const rows = await this.suppliers.find({
      where: { organizationId: identity.orgId },
      order: { nome: 'ASC' },
    });
    return { data: rows };
  }
}