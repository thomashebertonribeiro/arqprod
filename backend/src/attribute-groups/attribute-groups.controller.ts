import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttributeGroup } from './attribute-group.entity';
import { CurrentIdentity } from '../common/auth/current-identity.decorator';

export class CreateAttributeGroupDto {
  @ApiProperty({ example: 'Especificações técnicas' })
  @IsString()
  @MaxLength(255)
  nome: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;
}

@ApiTags('attribute-groups')
@ApiBearerAuth()
@Controller('attribute-groups')
export class AttributeGroupsController {
  constructor(
    @InjectRepository(AttributeGroup)
    private readonly groups: Repository<AttributeGroup>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar grupo de atributos (agrupamento visual)' })
  async create(
    @CurrentIdentity() identity: { orgId: string },
    @Body() dto: CreateAttributeGroupDto,
  ) {
    return this.groups.save(
      this.groups.create({
        organizationId: identity.orgId,
        nome: dto.nome,
        ordem: dto.ordem ?? 0,
      }),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar grupos de atributos' })
  async list(@CurrentIdentity() identity: { orgId: string }) {
    const rows = await this.groups.find({
      where: { organizationId: identity.orgId },
      order: { ordem: 'ASC', nome: 'ASC' },
    });
    return { data: rows, meta: { total: rows.length } };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de grupo' })
  async findOne(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    const group = await this.groups.findOne({
      where: { id, organizationId: identity.orgId },
    });
    if (!group) throw new NotFoundException('Grupo não encontrado');
    return group;
  }
}