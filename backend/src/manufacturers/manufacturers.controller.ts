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
import { Manufacturer } from './manufacturer.entity';
import { CreateManufacturerDto, UpdateManufacturerDto } from './dto';

@ApiTags('manufacturers')
@ApiBearerAuth()
@Controller('manufacturers')
export class ManufacturersController {
  constructor(
    @InjectRepository(Manufacturer)
    private readonly manufacturers: Repository<Manufacturer>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar fabricante' })
  create(@CurrentIdentity() identity: { orgId: string }, @Body() dto: CreateManufacturerDto) {
    return this.manufacturers.save(
      this.manufacturers.create({ organizationId: identity.orgId, nome: dto.nome }),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar fabricantes' })
  async list(@CurrentIdentity() identity: { orgId: string }) {
    const rows = await this.manufacturers.find({
      where: { organizationId: identity.orgId },
      order: { nome: 'ASC' },
    });
    return { data: rows };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar fabricante' })
  async update(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
    @Body() dto: UpdateManufacturerDto,
  ) {
    const manufacturer = await this.manufacturers.findOne({
      where: { id, organizationId: identity.orgId },
    });
    if (!manufacturer) throw new NotFoundException('Fabricante não encontrado');
    if (dto.nome !== undefined) manufacturer.nome = dto.nome;
    return this.manufacturers.save(manufacturer);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir fabricante (produtos ficam sem fabricante — SET NULL)' })
  async remove(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    const manufacturer = await this.manufacturers.findOne({
      where: { id, organizationId: identity.orgId },
    });
    if (!manufacturer) throw new NotFoundException('Fabricante não encontrado');
    await this.manufacturers.delete(manufacturer.id);
    return { id: manufacturer.id };
  }
}