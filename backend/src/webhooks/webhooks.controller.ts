import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook } from './webhook.entity';
import { CreateWebhookDto, UpdateWebhookDto } from './dto';
import { WebhooksService } from './webhooks.service';
import { CurrentIdentity } from '../common/auth/current-identity.decorator';

@ApiTags('webhooks')
@ApiBearerAuth()
@Controller('webhooks')
export class WebhooksController {
  constructor(
    @InjectRepository(Webhook)
    private readonly webhooks: Repository<Webhook>,
    private readonly service: WebhooksService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar webhook',
    description:
      'Eventos disponíveis: product.created, product.updated, variant.created, variant.updated, price.updated, stock.updated (ou "*").',
  })
  async create(
    @CurrentIdentity() identity: { orgId: string },
    @Body() dto: CreateWebhookDto,
  ) {
    const webhook = this.webhooks.create({
      organizationId: identity.orgId,
      urlDestino: dto.url_destino,
      eventos: dto.eventos,
      segredo: dto.segredo ?? null,
    });
    return this.webhooks.save(webhook);
  }

  @Get()
  @ApiOperation({ summary: 'Listar webhooks da organização' })
  async list(@CurrentIdentity() identity: { orgId: string }) {
    const rows = await this.webhooks.find({
      where: { organizationId: identity.orgId },
      order: { criadoEm: 'DESC' },
    });
    const counts = await this.service.countDeliveries(rows.map((w) => w.id));
    return {
      data: rows.map((w) => ({
        ...w,
        entregas: counts.get(w.id) ?? 0,
        segredo: w.segredo ? '(definido)' : null,
      })),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de webhook' })
  async findOne(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    const webhook = await this.webhooks.findOne({
      where: { id, organizationId: identity.orgId },
    });
    if (!webhook) throw new NotFoundException('Webhook não encontrado');
    return webhook;
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Histórico de entregas do webhook' })
  deliveries(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    return this.service.deliveriesOf(identity.orgId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar webhook (pausar/reativar, trocar URL)' })
  async update(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    const webhook = await this.webhooks.findOne({
      where: { id, organizationId: identity.orgId },
    });
    if (!webhook) throw new NotFoundException('Webhook não encontrado');
    if (dto.url_destino !== undefined) webhook.urlDestino = dto.url_destino;
    if (dto.eventos !== undefined) {
      if (dto.eventos.some((e) => e !== '*' && !['product.created', 'product.updated', 'variant.created', 'variant.updated', 'price.updated', 'stock.updated'].includes(e))) {
        throw new BadRequestException('Evento desconhecido');
      }
      webhook.eventos = dto.eventos;
    }
    if (dto.status !== undefined) webhook.status = dto.status;
    return this.webhooks.save(webhook);
  }
}