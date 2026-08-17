import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CategoryAttribute } from './category-attribute.entity';
import { Attribute } from '../attributes/attribute.entity';
import {
  CreateCategoryDto,
  LinkAttributeDto,
  UpdateCategoryDto,
} from './dto';
import { CurrentIdentity } from '../common/auth/current-identity.decorator';
import { paginate } from '../common/pagination';
import { normalizeChave } from '../attributes/attribute-value.validator';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(CategoryAttribute)
    private readonly links: Repository<CategoryAttribute>,
    @InjectRepository(Attribute)
    private readonly attributes: Repository<Attribute>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar categoria' })
  async create(
    @CurrentIdentity() identity: { orgId: string },
    @Body() dto: CreateCategoryDto,
  ) {
    const slug = normalizeChave(dto.slug);
    if (!slug) throw new BadRequestException('Slug inválido');

    if (dto.parent_id) {
      const parent = await this.categories.findOne({
        where: { id: dto.parent_id, organizationId: identity.orgId },
      });
      if (!parent) throw new BadRequestException('Categoria pai não encontrada');
    }

    const exists = await this.categories.findOne({
      where: { organizationId: identity.orgId, slug },
    });
    if (exists) throw new BadRequestException(`Slug "${slug}" já em uso`);

    const cat = this.categories.create({
      organizationId: identity.orgId,
      nome: dto.nome,
      slug,
      parentId: dto.parent_id ?? null,
      ordem: dto.ordem ?? 0,
    });
    return this.categories.save(cat);
  }

  @Get()
  @ApiOperation({ summary: 'Listar categorias (árvore hierárquica)' })
  async list(@CurrentIdentity() identity: { orgId: string }) {
    const rows = await this.categories.find({
      where: { organizationId: identity.orgId },
      order: { ordem: 'ASC', nome: 'ASC' },
      relations: { children: true },
    });
    const tree = rows.filter((c) => !c.parentId);
    return paginate(tree, tree.length, 1, 100);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de categoria' })
  async findOne(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    const cat = await this.categories.findOne({
      where: { id, organizationId: identity.orgId },
      relations: { parent: true },
    });
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    return cat;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar categoria' })
  async update(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const cat = await this.getOwned(identity.orgId, id);
    if (dto.nome !== undefined) cat.nome = dto.nome;
    if (dto.slug !== undefined) {
      const slug = normalizeChave(dto.slug);
      const dup = await this.categories.findOne({
        where: { organizationId: identity.orgId, slug },
      });
      if (dup && dup.id !== cat.id) throw new BadRequestException('Slug já em uso');
      cat.slug = slug;
    }
    if (dto.ordem !== undefined) cat.ordem = dto.ordem;
    return this.categories.save(cat);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover categoria' })
  async remove(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    const cat = await this.getOwned(identity.orgId, id);
    await this.categories.remove(cat);
    return { id };
  }

  @Get(':id/attributes')
  @ApiOperation({
    summary: 'Atributos do formulário da categoria (com herança de pais)',
    description:
      'Retorna os atributos vinculados via CategoryAttribute, incluindo os herdados das categorias pai quando herda_de_categoria_pai = true.',
  })
  async attributesOf(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
  ) {
    const cat = await this.getOwned(identity.orgId, id);
    const chain = await this.buildParentChain(cat);

    const allLinks = await this.links.find({
      where: chain.map((c) => ({ categoryId: c.id })),
      relations: { attribute: { validationRules: true, options: true } },
      order: { ordem: 'ASC' },
    });

    const effective = new Map<string, CategoryAttribute>();
    for (const link of allLinks) {
      const attr = link.attribute;
      if (attr.status !== 'ativo') continue;
      const inherited = link.categoryId !== cat.id;
      if (inherited && !link.herdaDeCategoriaPai) continue;

      const existing = effective.get(attr.id);
      if (!existing) {
        effective.set(attr.id, link);
      } else if (existing.categoryId !== cat.id && link.categoryId === cat.id) {
        effective.set(attr.id, link);
      }
    }

    return [...effective.values()].map((link) => ({
      id: link.id,
      herdado: link.categoryId !== cat.id,
      origem_categoria_id: link.categoryId,
      obrigatorio_na_categoria: link.obrigatorioNaCategoria,
      ordem: link.ordem,
      attribute: link.attribute,
    }));
  }

  @Post(':id/attributes')
  @ApiOperation({ summary: 'Vincular atributo a esta categoria' })
  async linkAttribute(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
    @Body() dto: LinkAttributeDto,
  ) {
    const cat = await this.getOwned(identity.orgId, id);
    const attr = await this.attributes.findOne({
      where: { id: dto.attribute_id, organizationId: identity.orgId },
    });
    if (!attr) throw new BadRequestException('Atributo não encontrado');

    const exists = await this.links.findOne({
      where: { categoryId: cat.id, attributeId: attr.id },
    });
    if (exists) throw new BadRequestException('Atributo já vinculado a esta categoria');

    return this.links.save(
      this.links.create({
        categoryId: cat.id,
        attributeId: attr.id,
        obrigatorioNaCategoria: dto.obrigatorio_na_categoria ?? false,
        herdaDeCategoriaPai: dto.herda_de_categoria_pai ?? false,
        ordem: dto.ordem ?? 0,
      }),
    );
  }

  @Delete(':id/attributes/:attributeId')
  @ApiOperation({ summary: 'Desvincular atributo da categoria' })
  async unlinkAttribute(
    @CurrentIdentity() identity: { orgId: string },
    @Param('id') id: string,
    @Param('attributeId') attributeId: string,
  ) {
    const cat = await this.getOwned(identity.orgId, id);
    const link = await this.links.findOne({
      where: { categoryId: cat.id, attributeId },
    });
    if (!link) throw new NotFoundException('Vínculo não encontrado');
    await this.links.remove(link);
    return { id: link.id, removido: true };
  }

  private async buildParentChain(cat: Category): Promise<Category[]> {
    const chain: Category[] = [cat];
    let current = cat;
    const seen = new Set<string>([cat.id]);
    let guard = 0;
    while (current.parentId && guard++ < 10) {
      if (seen.has(current.parentId)) break;
      const parent = await this.categories.findOne({
        where: { id: current.parentId },
      });
      if (!parent) break;
      chain.push(parent);
      seen.add(parent.id);
      current = parent;
    }
    return chain;
  }

  private async getOwned(orgId: string, id: string): Promise<Category> {
    const cat = await this.categories.findOne({
      where: { id, organizationId: orgId },
    });
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    return cat;
  }
}