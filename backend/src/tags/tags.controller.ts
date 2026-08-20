import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { IsString, MaxLength } from 'class-validator';
import { Repository } from 'typeorm';
import { CurrentIdentity } from '../common/auth/current-identity.decorator';
import { Tag } from './tag.entity';

export class CreateTagDto {
  @ApiProperty({ example: 'promo' })
  @IsString()
  @MaxLength(255)
  nome: string;
}

@ApiTags('tags')
@ApiBearerAuth()
@Controller('tags')
export class TagsController {
  constructor(
    @InjectRepository(Tag)
    private readonly tags: Repository<Tag>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar tag' })
  async create(
    @CurrentIdentity() identity: { orgId: string },
    @Body() dto: CreateTagDto,
  ) {
    const existing = await this.tags.findOne({
      where: { organizationId: identity.orgId, nome: dto.nome },
    });
    if (existing) return existing;
    return this.tags.save(
      this.tags.create({ organizationId: identity.orgId, nome: dto.nome }),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar tags' })
  async list(@CurrentIdentity() identity: { orgId: string }) {
    const rows = await this.tags.find({
      where: { organizationId: identity.orgId },
      order: { nome: 'ASC' },
    });
    return { data: rows };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir tag (remove dos produtos)' })
  async remove(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    const tag = await this.tags.findOne({ where: { id, organizationId: identity.orgId } });
    if (!tag) throw new NotFoundException('Tag não encontrada');
    await this.tags.delete(tag.id);
    return { id: tag.id };
  }
}