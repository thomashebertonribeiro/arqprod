import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Integration } from './integration.entity';
import { SyncLog } from '../sync-logs/sync-log.entity';
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
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Repository } from 'typeorm';
import { CurrentIdentity } from '../common/auth/current-identity.decorator';
import { CreateProductDto } from '../products/dto';
import { ProductsService } from '../products/products.service';
import { ProductsModule } from '../products/products.module';

export class CreateIntegrationDto {
  @ApiProperty({ enum: ['shopify', 'woocommerce', 'mercado_livre', 'planilha', 'custom'] })
  @IsIn(['shopify', 'woocommerce', 'mercado_livre', 'planilha', 'custom'])
  tipo: string;

  @ApiProperty({ example: 'Loja Shopify principal' })
  @IsString()
  @MaxLength(255)
  nome: string;

  @ApiPropertyOptional({ description: 'Credenciais — encriptadas em repouso (fase 2: conectores)' })
  @IsOptional()
  credenciais?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  configuracao?: Record<string, unknown>;
}

export class ImportProductDto extends CreateProductDto {}

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('integrations')
export class IntegrationsController {
  constructor(
    @InjectRepository(Integration)
    private readonly integrations: Repository<Integration>,
    @InjectRepository(SyncLog)
    private readonly syncLogs: Repository<SyncLog>,
    private readonly productsService: ProductsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar integração',
    description:
      'Conectores prontos (Shopify, Mercado Livre, WooCommerce) ficam para a fase 2 — aqui apenas o registro.',
  })
  create(@CurrentIdentity() identity: { orgId: string }, @Body() dto: CreateIntegrationDto) {
    return this.integrations.save(
      this.integrations.create({
        organizationId: identity.orgId,
        tipo: dto.tipo as Integration['tipo'],
        nome: dto.nome,
        credenciais: dto.credenciais ?? null,
        configuracao: dto.configuracao ?? {},
      }),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar integrações' })
  async list(@CurrentIdentity() identity: { orgId: string }) {
    const rows = await this.integrations.find({
      where: { organizationId: identity.orgId },
      order: { criadoEm: 'DESC' },
    });
    return {
      data: rows.map((i) => ({
        ...i,
        credenciais: i.credenciais ? '(definidas, encriptadas em repouso)' : null,
      })),
    };
  }

  @Get(':id/sync-logs')
  @ApiOperation({ summary: 'Logs de sincronização da integração' })
  async syncLogsOf(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    const integration = await this.integrations.findOne({
      where: { id, organizationId: identity.orgId },
    });
    if (!integration) throw new NotFoundException('Integração não encontrada');
    const rows = await this.syncLogs.find({
      where: { integrationId: integration.id },
      order: { iniciadoEm: 'DESC' },
      take: 50,
    });
    return { data: rows };
  }

  @Post(':id/import-product')
  @ApiOperation({
    summary: 'Importar produto via integração (cria produto com origem_integracao)',
  })
  async importProduct(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
    @Body() dto: ImportProductDto,
  ) {
    const integration = await this.integrations.findOne({
      where: { id, organizationId: identity.orgId },
    });
    if (!integration) throw new NotFoundException('Integração não encontrada');
    const product = await this.productsService.create(identity.orgId, {
      ...dto,
      origem_integracao: integration.tipo,
    });
    const log = this.syncLogs.create({
      integrationId: integration.id,
      status: 'sucesso',
      itensProcessados: 1,
      itensComErro: 0,
      finalizadoEm: new Date(),
      detalhes: { produto: product.id },
    });
    await this.syncLogs.save(log);
    return product;
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([Integration, SyncLog]),
    ProductsModule,
  ],
  controllers: [IntegrationsController],
  exports: [TypeOrmModule],
})
export class IntegrationsModule {}