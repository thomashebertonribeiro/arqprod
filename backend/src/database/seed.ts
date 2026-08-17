import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import dataSource from './data-source';
import { Organization } from '../organizations/organization.entity';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
import { Attribute } from '../attributes/attribute.entity';
import { AttributeOption } from '../attributes/attribute-option.entity';
import { CategoryAttribute } from '../categories/category-attribute.entity';
import { Product } from '../products/product.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { ProductAttributeValue } from '../products/product-attribute-value.entity';
import { ProductVariantAttributeValue } from '../products/product-variant-attribute-value.entity';
import { Channel } from '../channels/channel.entity';
import { Price } from '../prices/price.entity';
import { Warehouse } from '../warehouses/warehouse.entity';
import { StockItem } from '../stock/stock-item.entity';
import { Supplier } from '../suppliers/supplier.entity';
import { ProductImage } from '../products/product-image.entity';

export async function runSeed() {
  await dataSource.initialize();
  const orgRepo = dataSource.getRepository(Organization);
  const userRepo = dataSource.getRepository(User);
  const catRepo = dataSource.getRepository(Category);
  const attrRepo = dataSource.getRepository(Attribute);
  const optRepo = dataSource.getRepository(AttributeOption);
  const linkRepo = dataSource.getRepository(CategoryAttribute);
  const productRepo = dataSource.getRepository(Product);
  const variantRepo = dataSource.getRepository(ProductVariant);
  const pavRepo = dataSource.getRepository(ProductAttributeValue);
  const pvavRepo = dataSource.getRepository(ProductVariantAttributeValue);
  const imageRepo = dataSource.getRepository(ProductImage);
  const channelRepo = dataSource.getRepository(Channel);
  const priceRepo = dataSource.getRepository(Price);
  const warehouseRepo = dataSource.getRepository(Warehouse);
  const stockRepo = dataSource.getRepository(StockItem);
  const supplierRepo = dataSource.getRepository(Supplier);

  const orgSlug = process.env.SEED_ORG_SLUG ?? 'exemplo';
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@exemplo.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin123456';

  let org = await orgRepo.findOne({ where: { slug: orgSlug } });
  if (!org) {
    org = await orgRepo.save(orgRepo.create({ nome: 'Exemplo Ltda', slug: orgSlug }));
    console.log(`[seed] Organização criada: ${orgSlug}`);
  }

  let admin = await userRepo.findOne({ where: { email: adminEmail } });
  if (!admin) {
    admin = await userRepo.save(
      userRepo.create({
        organizationId: org.id,
        nome: 'Admin Exemplo',
        email: adminEmail,
        senhaHash: await bcrypt.hash(adminPassword, 10),
        papel: 'admin',
      }),
    );
    console.log(`[seed] Admin criado: ${adminEmail} / ${adminPassword}`);
  }

  let eletronicos = await catRepo.findOne({
    where: { organizationId: org.id, slug: 'eletronicos' },
  });
  if (!eletronicos) {
    eletronicos = await catRepo.save(
      catRepo.create({
        organizationId: org.id,
        nome: 'Eletrônicos',
        slug: 'eletronicos',
        ordem: 0,
      }),
    );
  }

  // Atributos customizados: Voltagem (lista) e Garantia (texto)
  const voltagem = await ensureAttribute(attrRepo, org.id, admin.id, {
    nome: 'Voltagem',
    chave: 'voltagem',
    tipoDado: 'lista',
    nivel: 'produto',
  });
  await ensureOption(optRepo, voltagem.id, '110V', 0);
  await ensureOption(optRepo, voltagem.id, '220V', 1);
  await ensureOption(optRepo, voltagem.id, 'Bivolt', 2);

  const garantia = await ensureAttribute(attrRepo, org.id, admin.id, {
    nome: 'Garantia',
    chave: 'garantia',
    tipoDado: 'texto',
    nivel: 'produto',
  });

  await ensureLink(linkRepo, eletronicos.id, voltagem.id, 0, true);
  await ensureLink(linkRepo, eletronicos.id, garantia.id, 1, true);

  // Atributo de variação de exemplo
  const cor = await ensureAttribute(attrRepo, org.id, admin.id, {
    nome: 'Cor',
    chave: 'cor',
    tipoDado: 'lista',
    nivel: 'variacao',
  });
  await ensureOption(optRepo, cor.id, 'Preto', 0);
  await ensureOption(optRepo, cor.id, 'Prata', 1);

  let supplier = await supplierRepo.findOne({ where: { organizationId: org.id } });
  if (!supplier) {
    supplier = await supplierRepo.save(
      supplierRepo.create({
        organizationId: org.id,
        nome: 'Distribuidora Nacional',
        contato: { email: 'vendas@distribuidora.com', telefone: '+55 11 4000-0000' },
      }),
    );
  }

  // Produto de exemplo
  let produto = await productRepo.findOne({
    where: { organizationId: org.id, skuBase: 'TEC-001' },
  });
  if (!produto) {
    produto = await productRepo.save(
      productRepo.create({
        organizationId: org.id,
        categoryId: eletronicos.id,
        supplierId: supplier.id,
        nome: 'Fone Bluetooth Pro',
        descricao: 'Fone sem fio com cancelamento de ruído e 30h de bateria.',
        skuBase: 'TEC-001',
        status: 'ativo',
        origemIntegracao: null,
      }),
    );
    console.log('[seed] Produto criado: Fone Bluetooth Pro (TEC-001)');

    await pavRepo.save(
      pavRepo.create({
        productId: produto.id,
        attributeId: voltagem.id,
        valor: 'Bivolt',
        atualizadoPor: admin.id,
      }),
    );
    await pavRepo.save(
      pavRepo.create({
        productId: produto.id,
        attributeId: garantia.id,
        valor: '12 meses',
        atualizadoPor: admin.id,
      }),
    );
    await imageRepo.save(
      imageRepo.create({
        productId: produto.id,
        url: 'https://picsum.photos/seed/arqprod-fone/200/200',
        ordem: 0,
        altText: 'Fone Bluetooth Pro',
      }),
    );
  }

  let variante = await variantRepo.findOne({ where: { sku: 'TEC-001-PRETO' } });
  if (!variante) {
    variante = await variantRepo.save(
      variantRepo.create({
        productId: produto.id,
        sku: 'TEC-001-PRETO',
        eanGtin: '7891234567890',
        combinacao: { cor: 'Preto' },
        pesoKg: '0.1800',
        dimensoes: { altura_cm: 6, largura_cm: 6, profundidade_cm: 3 },
        status: 'ativo',
      }),
    );
    await pvavRepo.save(
      pvavRepo.create({
        productVariantId: variante.id,
        attributeId: cor.id,
        valor: 'Preto',
      }),
    );
  }

  // Canal, preço, armazém e estoque para o produto de exemplo
  let canal = await channelRepo.findOne({ where: { organizationId: org.id } });
  if (!canal) {
    canal = await channelRepo.save(
      channelRepo.create({ organizationId: org.id, nome: 'Loja própria', tipo: 'site_proprio' }),
    );
    await channelRepo.save(
      channelRepo.create({ organizationId: org.id, nome: 'Marketplace A', tipo: 'marketplace' }),
    );
  }

  const preco = await priceRepo.findOne({
    where: { productVariantId: variante.id, channelId: canal.id, moeda: 'BRL' },
  });
  if (!preco) {
    await priceRepo.save(
      priceRepo.create({
        productVariantId: variante.id,
        channelId: canal.id,
        moeda: 'BRL',
        valor: '199.90',
        valorPromocional: '149.90',
      }),
    );
  }

  let warehouse = await warehouseRepo.findOne({ where: { organizationId: org.id } });
  if (!warehouse) {
    warehouse = await warehouseRepo.save(
      warehouseRepo.create({
        organizationId: org.id,
        nome: 'CD São Paulo',
        endereco: { cidade: 'São Paulo', uf: 'SP', cep: '01000-000' },
      }),
    );
  }

  const stock = await stockRepo.findOne({
    where: { productVariantId: variante.id, warehouseId: warehouse.id },
  });
  if (!stock) {
    await stockRepo.save(
      stockRepo.create({
        productVariantId: variante.id,
        warehouseId: warehouse.id,
        quantidade: 25,
        reservado: 3,
      }),
    );
  }

  // Reconstruir o cache JSONB do produto (como faz o ProductsService)
  const produtoAtual = await productRepo.findOne({ where: { id: produto.id } });
  const pavs = await pavRepo.find({ where: { productId: produto.id }, relations: { attribute: true } });
  const variants = await variantRepo.find({ where: { productId: produto.id }, relations: { attributeValues: { attribute: true } } });
  const cache: Record<string, unknown> = {};
  for (const p of pavs) cache[p.attribute.chave] = p.valor;
  cache.variacoes = variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    combinacao: v.combinacao,
    valores: Object.fromEntries(v.attributeValues.map((av) => [av.attribute.chave, av.valor])),
  }));
  if (produtoAtual) {
    produtoAtual.atributos = cache;
    await productRepo.save(produtoAtual);
  }

  await dataSource.destroy();
  console.log('\n[seed] Concluído! Resumo:');
  console.log('  Login painel : POST /api/auth/login  (JWT)');
  console.log(`    email: ${adminEmail}`);
  console.log(`    senha: ${adminPassword}`);
  console.log('  Documentação: /api/docs');
  console.log('  Crie uma API key em POST /api/api-keys para usar a API externa.');
}

async function ensureAttribute(
  repo: ReturnType<typeof dataSource.getRepository<Attribute>>,
  orgId: string,
  userId: string,
  data: Partial<Attribute>,
) {
  const existing = await repo.findOne({
    where: { organizationId: orgId, chave: data.chave as string },
  });
  if (existing) return existing;
  const attr = await repo.save(
    repo.create({
      organizationId: orgId,
      criadoPor: userId,
      nome: data.nome,
      chave: data.chave,
      tipoDado: data.tipoDado,
      nivel: data.nivel ?? 'produto',
      status: 'ativo',
    }),
  );
  console.log(`[seed] Atributo criado: ${attr.chave} (${attr.tipoDado}/${attr.nivel})`);
  return attr;
}

async function ensureOption(
  repo: ReturnType<typeof dataSource.getRepository<AttributeOption>>,
  attributeId: string,
  valor: string,
  ordem: number,
) {
  const existing = await repo.findOne({ where: { attributeId, valor } });
  if (existing) return existing;
  return repo.save(repo.create({ attributeId, valor, ordem }));
}

async function ensureLink(
  repo: ReturnType<typeof dataSource.getRepository<CategoryAttribute>>,
  categoryId: string,
  attributeId: string,
  ordem: number,
  herda: boolean,
) {
  const existing = await repo.findOne({ where: { categoryId, attributeId } });
  if (existing) return existing;
  return repo.save(
    repo.create({
      categoryId,
      attributeId,
      ordem,
      herdaDeCategoriaPai: herda,
      obrigatorioNaCategoria: false,
    }),
  );
}

if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] Falhou:', err);
      process.exit(1);
    });
}