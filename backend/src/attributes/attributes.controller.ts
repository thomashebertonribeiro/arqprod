import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Attribute } from './attribute.entity';
import { AttributeOption } from './attribute-option.entity';
import { AttributeValidationRule } from './attribute-validation-rule.entity';
import {
  AddAttributeOptionDto,
  CreateAttributeDto,
  UpdateAttributeDto,
} from './dto';
import { normalizeChave } from './attribute-value.validator';
import { CurrentIdentity } from '../common/auth/current-identity.decorator';
import { paginate, withPagination } from '../common/pagination';

@ApiTags('attributes')
@ApiBearerAuth()
@Controller('attributes')
export class AttributesController {
  constructor(
    @InjectRepository(Attribute)
    private readonly attributes: Repository<Attribute>,
    @InjectRepository(AttributeOption)
    private readonly options: Repository<AttributeOption>,
    @InjectRepository(AttributeValidationRule)
    private readonly rules: Repository<AttributeValidationRule>,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Criar campo customizado — sem migração de banco',
    description:
      'Cria a definição do campo. Valores são validados na camada de aplicação e persistidos em JSONB.',
  })
  async create(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Body() dto: CreateAttributeDto,
  ) {
    const chave = normalizeChave(dto.chave);
    if (!chave) throw new BadRequestException('Chave inválida (use letras, números e _)');

    const exists = await this.attributes.findOne({
      where: { organizationId: identity.orgId, chave },
    });
    if (exists) throw new BadRequestException(`Atributo com chave "${chave}" já existe`);

    const requiresOptions = dto.tipo_dado === 'lista' || dto.tipo_dado === 'lista_multipla';

    const attr = this.attributes.create({
      organizationId: identity.orgId,
      nome: dto.nome,
      chave,
      tipoDado: dto.tipo_dado,
      nivel: dto.nivel,
      attributeGroupId: dto.attribute_group_id ?? null,
      criadoPor: identity.userId ?? null,
    });

    if (dto.regra_validacao) {
      attr.validationRules = [
        this.rules.create({
          obrigatorio: dto.regra_validacao.obrigatorio ?? false,
          valorMin: dto.regra_validacao.valor_min != null ? String(dto.regra_validacao.valor_min) : null,
          valorMax: dto.regra_validacao.valor_max != null ? String(dto.regra_validacao.valor_max) : null,
          tamanhoMax: dto.regra_validacao.tamanho_max ?? null,
          regex: dto.regra_validacao.regex ?? null,
          mensagemErro: dto.regra_validacao.mensagem_erro ?? null,
        }),
      ];
    }

    if (requiresOptions) {
      if (!dto.opcoes?.length) {
        throw new BadRequestException(
          'Atributos do tipo lista/lista_multipla exigem ao menos uma opção',
        );
      }
      attr.options = dto.opcoes.map((o, i) =>
        this.options.create({ valor: o.valor, ordem: o.ordem ?? i }),
      );
    } else if (dto.opcoes?.length) {
      throw new BadRequestException('Opções só são permitidas para lista/lista_multipla');
    }

    const saved = await this.attributes.save(attr);
    return this.findById(identity.orgId, saved.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar campos customizados' })
  @ApiQuery({ name: 'nivel', required: false, enum: ['produto', 'variacao'] })
  @ApiQuery({ name: 'status', required: false, enum: ['ativo', 'arquivado'] })
  @ApiQuery({ name: 'tipo_dado', required: false, enum: ['texto', 'numero', 'booleano', 'lista', 'lista_multipla', 'data'] })
  async list(
    @CurrentIdentity() identity: { orgId: string },
    @Query('nivel') nivel?: string,
    @Query('status') status?: string,
    @Query('tipo_dado') tipoDado?: string,
    @Query() query: Record<string, string> = {},
  ) {
    const { skip, take, page, perPage } = withPagination(query);
    const where: Record<string, unknown> = { organizationId: identity.orgId };
    if (nivel) where.nivel = nivel;
    if (status) where.status = status;
    if (tipoDado) where.tipoDado = tipoDado;

    const [rows, total] = await this.attributes.findAndCount({
      where,
      relations: { validationRules: true, options: true, attributeGroup: true },
      order: { criadoEm: 'ASC' },
      skip,
      take,
    });
    return paginate(rows, total, page, perPage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um campo customizado' })
  async findOne(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    return this.findById(identity.orgId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar campo (chave é imutável)',
    description: 'A chave não pode ser alterada após a criação.',
  })
  async update(
    @CurrentIdentity() identity: { orgId: string; userId?: string },
    @Param('id') id: string,
    @Body() dto: UpdateAttributeDto,
  ) {
    const attr = await this.getOwned(identity.orgId, id);
    if (dto.nome !== undefined) attr.nome = dto.nome;
    if (dto.attribute_group_id !== undefined) attr.attributeGroupId = dto.attribute_group_id || null;
    if (dto.status !== undefined) attr.status = dto.status;
    await this.attributes.save(attr);
    return this.findById(identity.orgId, id);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Arquivar atributo (soft delete)',
    description:
      'Atributos nunca são deletados de fato — apenas arquivados, para não quebrar produtos e integrações.',
  })
  async archive(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    const attr = await this.getOwned(identity.orgId, id);
    attr.status = 'arquivado';
    await this.attributes.save(attr);
    return { id: attr.id, status: 'arquivado' };
  }

  @Post(':id/options')
  @ApiOperation({ summary: 'Adicionar opção a um campo lista/lista_multipla' })
  async addOption(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
    @Body() dto: AddAttributeOptionDto,
  ) {
    const attr = await this.getOwned(identity.orgId, id);
    if (attr.tipoDado !== 'lista' && attr.tipoDado !== 'lista_multipla') {
      throw new BadRequestException('Opções só são permitidas para lista/lista_multipla');
    }
    const option = this.options.create({
      attributeId: attr.id,
      valor: dto.valor,
      ordem: dto.ordem ?? (attr.options?.length ?? 0),
    });
    return this.options.save(option);
  }

  @Get(':id/options')
  @ApiOperation({ summary: 'Listar opções de um campo' })
  async listOptions(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    const attr = await this.getOwned(identity.orgId, id);
    return this.options.find({
      where: { attributeId: attr.id },
      order: { ordem: 'ASC' },
    });
  }

  async findById(orgId: string, id: string) {
    const attr = await this.attributes.findOne({
      where: { id, organizationId: orgId },
      relations: { validationRules: true, options: true, attributeGroup: true },
    });
    if (!attr) throw new NotFoundException('Atributo não encontrado');
    return attr;
  }

  private async getOwned(orgId: string, id: string): Promise<Attribute> {
    const attr = await this.attributes.findOne({
      where: { id, organizationId: orgId },
      relations: { validationRules: true, options: true },
    });
    if (!attr) throw new NotFoundException('Atributo não encontrado');
    return attr;
  }

  /** Helper usado por outros módulos: buscar vários atributos com validação de tenant */
  async findByIds(orgId: string, ids: string[]): Promise<Attribute[]> {
    if (!ids.length) return [];
    return this.attributes.find({
      where: { id: In(ids), organizationId: orgId, status: 'ativo' },
      relations: { validationRules: true, options: true },
    });
  }
}