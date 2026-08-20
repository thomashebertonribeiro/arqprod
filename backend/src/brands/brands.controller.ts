import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentIdentity } from '../common/auth/current-identity.decorator';
import { Brand } from './brand.entity';
import { CreateBrandDto, UpdateBrandDto } from './dto';

@ApiTags('brands')
@ApiBearerAuth()
@Controller('brands')
export class BrandsController {
  constructor(
    @InjectRepository(Brand)
    private readonly brands: Repository<Brand>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar marca' })
  create(@CurrentIdentity() identity: { orgId: string }, @Body() dto: CreateBrandDto) {
    return this.brands.save(
      this.brands.create({ organizationId: identity.orgId, nome: dto.nome }),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar marcas' })
  async list(@CurrentIdentity() identity: { orgId: string }) {
    const rows = await this.brands.find({
      where: { organizationId: identity.orgId },
      order: { nome: 'ASC' },
    });
    return { data: rows };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar marca' })
  async update(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
  ) {
    const brand = await this.brands.findOne({ where: { id, organizationId: identity.orgId } });
    if (!brand) throw new NotFoundException('Marca não encontrada');
    if (dto.nome !== undefined) brand.nome = dto.nome;
    return this.brands.save(brand);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir marca (produtos ficam sem marca — SET NULL)' })
  async remove(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    const brand = await this.brands.findOne({ where: { id, organizationId: identity.orgId } });
    if (!brand) throw new NotFoundException('Marca não encontrada');
    await this.brands.delete(brand.id);
    return { id: brand.id };
  }
}