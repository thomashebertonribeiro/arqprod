import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ApiKey } from './api-key.entity';
import { generateApiKey, hashApiKey } from '../common/auth/api-key.util';
import { CreateApiKeyDto, ApiKeyCreatedDto } from './dto';
import { Roles } from '../common/auth/decorators';
import { CurrentIdentity } from '../common/auth/current-identity.decorator';

@ApiTags('api-keys')
@Controller('api-keys')
export class ApiKeysController {
  constructor(
    @InjectRepository(ApiKey)
    private readonly keys: Repository<ApiKey>,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @Roles('admin')
  @ApiOperation({
    summary: 'Criar API key (somente painel, papel admin)',
    description:
      'Nunca deve ser chamada com uma API key — apenas com JWT de usuário admin.',
  })
  async create(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Body() dto: CreateApiKeyDto,
  ): Promise<ApiKeyCreatedDto> {
    const rawKey = generateApiKey();
    const salt = this.config.get<string>('API_KEY_HASH_SALT') ?? '';
    const entity = this.keys.create({
      organizationId: identity.orgId,
      nome: dto.nome,
      chaveHash: hashApiKey(rawKey, salt),
      escopos: dto.escopos,
      expiraEm: dto.expira_em ? new Date(dto.expira_em) : null,
    });
    const saved = await this.keys.save(entity);
    return {
      chave: rawKey,
      id: saved.id,
      nome: saved.nome,
      escopos: saved.escopos,
      criado_em: saved.criadoEm,
    };
  }

  @Get()
  @Roles('admin', 'editor')
  @ApiOperation({ summary: 'Listar API keys da organização (sem a chave bruta)' })
  async list(
    @CurrentIdentity() identity: { orgId: string },
    @Query('page') page = '1',
    @Query('per_page') perPage = '20',
  ) {
    const take = Math.min(100, Math.max(1, Number(perPage) || 20));
    const skip = (Math.max(1, Number(page) || 1) - 1) * take;
    const [rows, total] = await this.keys.findAndCount({
      where: { organizationId: identity.orgId },
      order: { criadoEm: 'DESC' },
      skip,
      take,
    });
    return {
      data: rows.map((k) => ({
        id: k.id,
        nome: k.nome,
        escopos: k.escopos,
        ultima_utilizacao: k.ultimaUtilizacao,
        expira_em: k.expiraEm,
        status: k.status,
        criado_em: k.criadoEm,
      })),
      meta: {
        page: Math.max(1, Number(page) || 1),
        per_page: take,
        total,
        total_pages: Math.ceil(total / take),
      },
    };
  }

  @Post(':id/revoke')
  @Roles('admin')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revogar API key' })
  async revoke(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ): Promise<void> {
    const key = await this.keys.findOne({
      where: { id, organizationId: identity.orgId },
    });
    if (!key) throw new BadRequestException('API key não encontrada');
    key.status = 'revogada';
    await this.keys.save(key);
  }
}