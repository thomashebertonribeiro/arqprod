import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { MlMonitorService, PublishToMlDto } from './ml-monitor.service';
import { MlWebhookService, MlNotification } from './ml-webhook.service';
import { MlProviderAdapterService } from './ml-provider-adapter.service';
import { MlListingStatus } from './ml-listing.entity';
import { CurrentIdentity } from '../common/auth/current-identity.decorator';


@ApiTags('ML Monitor')
@ApiBearerAuth()
@Controller('ml')
export class MlMonitorController {
  constructor(
    private readonly service: MlMonitorService,
    private readonly adapter: MlProviderAdapterService,
    private readonly webhookService: MlWebhookService,
  ) {}

  // ==================== AUTH ====================

  @Get('auth/status')
  @ApiOperation({ summary: 'Status da autenticação ML' })
  async getAuthStatus(@CurrentIdentity() identity: { orgId: string }) {
    return this.service.getAuthStatus(identity.orgId);
  }

  @Post('auth/credentials')
  @ApiOperation({ summary: 'Salvar credenciais ML (access_token + client_id/secret)' })
  async saveCredentials(
    @CurrentIdentity() identity: { orgId: string },
    @Body() dto: { access_token: string; refresh_token?: string; client_id?: string; client_secret?: string },
  ) {
    await this.service.saveCredentials(identity.orgId, dto);
    return { message: 'Credenciais salvas' };
  }

  @Post('auth/refresh')
  @ApiOperation({ summary: 'Renovar access_token via refresh_token' })
  async refreshToken(@CurrentIdentity() identity: { orgId: string }) {
    const auth = await this.adapter.refreshToken(identity.orgId);
    return { user_id: auth.user_id, nickname: auth.nickname };
  }

  // ==================== LISTINGS ====================

  @Post('publish/:productId')
  @ApiOperation({ summary: 'Publicar produto no Mercado Livre' })
  async publish(
    @CurrentIdentity() identity: { orgId: string },
    @Param('productId') productId: string,
    @Body() dto: PublishToMlDto,
  ) {
    return this.service.publish(identity.orgId, productId, dto);
  }

  @Get('listings')
  @ApiOperation({ summary: 'Listar anúncios ML' })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  async listListings(
    @CurrentIdentity() identity: { orgId: string },
    @Query('productId') productId?: string,
    @Query('status') status?: MlListingStatus,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.service.listListings(identity.orgId, {
      productId,
      status,
      page: page ? parseInt(page, 10) : 1,
      perPage: perPage ? parseInt(perPage, 10) : 20,
    });
  }

  @Get('listings/:id')
  @ApiOperation({ summary: 'Detalhe de um listing ML' })
  async getListing(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    return this.service.getListing(identity.orgId, id);
  }

  @Put('listings/:id/sync')
  @ApiOperation({ summary: 'Sincronizar listing com ML (busca status atual)' })
  async syncFromMl(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    return this.service.syncFromMl(identity.orgId, id);
  }

  @Post('listings/sync-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sincronizar todos listings da conta ML' })
  async syncAll(@CurrentIdentity() identity: { orgId: string }) {
    return this.service.syncAllFromMl(identity.orgId);
  }

  @Put('listings/:id/pause')
  @HttpCode(200)
  @ApiOperation({ summary: 'Pausar anúncio no ML' })
  async pause(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    return this.service.pauseListing(identity.orgId, id);
  }

  @Put('listings/:id/activate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Ativar anúncio no ML' })
  async activate(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    return this.service.activateListing(identity.orgId, id);
  }

  @Put('listings/:id/price')
  @ApiOperation({ summary: 'Atualizar preço no ML' })
  async updatePrice(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
    @Body() dto: { price: number },
  ) {
    return this.service.updatePrice(identity.orgId, id, dto.price);
  }

  @Put('listings/:id/stock')
  @ApiOperation({ summary: 'Atualizar estoque no ML' })
  async updateStock(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
    @Body() dto: { quantity: number },
  ) {
    return this.service.updateStock(identity.orgId, id, dto.quantity);
  }

  @Put('listings/:id/end')
  @HttpCode(200)
  @ApiOperation({ summary: 'Encerrar anúncio no ML' })
  async end(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    return this.service.endListing(identity.orgId, id);
  }

  @Delete('listings/:id')
  @ApiOperation({ summary: 'Excluir listing do banco + encerrar no ML' })
  async delete(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    await this.service.deleteListing(identity.orgId, id);
    return { deleted: true };
  }

  // ==================== SUGGEST CATEGORY ====================

  @Get('suggest-category/:productId')
  @ApiOperation({ summary: 'Sugerir categoria ML via AI (match por palavras-chave)' })
  async suggestCategory(
    @CurrentIdentity() identity: { orgId: string },
    @Param('productId') productId: string,
  ) {
    return this.service.suggestCategory(identity.orgId, productId);
  }

  // ==================== READINESS ====================

  @Get('readiness/:productId')
  @ApiOperation({ summary: 'Verificar prontidão do produto para publicar no ML' })
  async getReadiness(
    @CurrentIdentity() identity: { orgId: string },
    @Param('productId') productId: string,
  ) {
    return this.service.getReadinessForMl(identity.orgId, productId);
  }

  // ==================== WEBHOOK ====================

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receber notificações do ML (webhook callback)' })
  async handleWebhook(
    @CurrentIdentity() identity: { orgId: string },
    @Body() body: MlNotification,
  ) {
    await this.webhookService.handleNotification(identity.orgId, body);
    return { received: true };
  }

  // ==================== CATEGORIES ====================

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorias ML (MLB)' })
  async getCategories(@CurrentIdentity() identity: { orgId: string }) {
    return this.adapter.getCategories(identity.orgId);
  }

  @Get('categories/:categoryId/attributes')
  @ApiOperation({ summary: 'Atributos obrigatórios de uma categoria ML' })
  async getCategoryAttributes(
    @CurrentIdentity() identity: { orgId: string },
    @Param('categoryId') categoryId: string,
  ) {
    return this.adapter.getCategoryAttributes(identity.orgId, categoryId);
  }
}
