import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAllTables1740000000000 implements MigrationInterface {
  name = 'CreateAllTables1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ---------------------------------------------------------------- organizations
    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "nome" varchar(255) NOT NULL,
        "slug" varchar(120) NOT NULL UNIQUE,
        "plano" varchar(20) NOT NULL DEFAULT 'free',
        "status" varchar(20) NOT NULL DEFAULT 'ativo',
        "configuracoes" jsonb NOT NULL DEFAULT '{}',
        "criado_em" timestamptz NOT NULL DEFAULT now()
      )`);

    // ---------------------------------------------------------------- users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "nome" varchar(255) NOT NULL,
        "email" varchar(255) NOT NULL UNIQUE,
        "senha_hash" varchar(255) NOT NULL,
        "papel" varchar(20) NOT NULL DEFAULT 'leitor',
        "criado_em" timestamptz NOT NULL DEFAULT now(),
        "ultimo_acesso" timestamptz NULL
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_users_organization" ON "users" ("organization_id")`,
    );

    // ---------------------------------------------------------------- api_keys
    await queryRunner.query(`
      CREATE TABLE "api_keys" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "nome" varchar(255) NOT NULL,
        "chave_hash" varchar(255) NOT NULL UNIQUE,
        "escopos" text[] NOT NULL DEFAULT '{}',
        "ultima_utilizacao" timestamptz NULL,
        "expira_em" timestamptz NULL,
        "status" varchar(20) NOT NULL DEFAULT 'ativa',
        "criado_em" timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_api_keys_organization" ON "api_keys" ("organization_id")`,
    );

    // ---------------------------------------------------------------- categories
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "parent_id" uuid NULL REFERENCES "categories"("id") ON DELETE SET NULL,
        "nome" varchar(255) NOT NULL,
        "slug" varchar(255) NOT NULL,
        "ordem" int NOT NULL DEFAULT 0,
        "criado_em" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("organization_id", "slug")
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_categories_organization" ON "categories" ("organization_id")`,
    );

    // ---------------------------------------------------------------- attribute_groups
    await queryRunner.query(`
      CREATE TABLE "attribute_groups" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "nome" varchar(255) NOT NULL,
        "ordem" int NOT NULL DEFAULT 0
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_attribute_groups_organization" ON "attribute_groups" ("organization_id")`,
    );

    // ---------------------------------------------------------------- attributes
    await queryRunner.query(`
      CREATE TABLE "attributes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "attribute_group_id" uuid NULL REFERENCES "attribute_groups"("id") ON DELETE SET NULL,
        "nome" varchar(255) NOT NULL,
        "chave" varchar(255) NOT NULL,
        "tipo_dado" varchar(30) NOT NULL,
        "nivel" varchar(20) NOT NULL DEFAULT 'produto',
        "status" varchar(20) NOT NULL DEFAULT 'ativo',
        "criado_em" timestamptz NOT NULL DEFAULT now(),
        "criado_por" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        UNIQUE ("organization_id", "chave")
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_attributes_organization" ON "attributes" ("organization_id")`,
    );

    // ---------------------------------------------------------------- attribute_validation_rules
    await queryRunner.query(`
      CREATE TABLE "attribute_validation_rules" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "attribute_id" uuid NOT NULL REFERENCES "attributes"("id") ON DELETE CASCADE,
        "obrigatorio" boolean NOT NULL DEFAULT false,
        "valor_min" numeric(18,6) NULL,
        "valor_max" numeric(18,6) NULL,
        "tamanho_max" int NULL,
        "regex" varchar(512) NULL,
        "mensagem_erro" varchar(512) NULL,
        UNIQUE ("attribute_id")
      )`);

    // ---------------------------------------------------------------- attribute_options
    await queryRunner.query(`
      CREATE TABLE "attribute_options" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "attribute_id" uuid NOT NULL REFERENCES "attributes"("id") ON DELETE CASCADE,
        "valor" varchar(255) NOT NULL,
        "ordem" int NOT NULL DEFAULT 0,
        "status" varchar(20) NOT NULL DEFAULT 'ativo'
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_attribute_options_attribute" ON "attribute_options" ("attribute_id")`,
    );

    // ---------------------------------------------------------------- category_attributes
    await queryRunner.query(`
      CREATE TABLE "category_attributes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "category_id" uuid NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
        "attribute_id" uuid NOT NULL REFERENCES "attributes"("id") ON DELETE CASCADE,
        "obrigatorio_na_categoria" boolean NOT NULL DEFAULT false,
        "ordem" int NOT NULL DEFAULT 0,
        "herda_de_categoria_pai" boolean NOT NULL DEFAULT false,
        UNIQUE ("category_id", "attribute_id")
      )`);

    // ---------------------------------------------------------------- suppliers
    await queryRunner.query(`
      CREATE TABLE "suppliers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "nome" varchar(255) NOT NULL,
        "contato" jsonb NULL,
        "criado_em" timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_suppliers_organization" ON "suppliers" ("organization_id")`,
    );

    // ---------------------------------------------------------------- products
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "category_id" uuid NULL REFERENCES "categories"("id") ON DELETE SET NULL,
        "supplier_id" uuid NULL REFERENCES "suppliers"("id") ON DELETE SET NULL,
        "nome" varchar(255) NOT NULL,
        "descricao" text NULL,
        "sku_base" varchar(120) NULL,
        "status" varchar(30) NOT NULL DEFAULT 'rascunho',
        "atributos" jsonb NOT NULL DEFAULT '{}',
        "origem_integracao" varchar(60) NULL,
        "criado_em" timestamptz NOT NULL DEFAULT now(),
        "atualizado_em" timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_products_organization" ON "products" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_category" ON "products" ("category_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_products_updated" ON "products" ("atualizado_em")`,
    );

    // ---------------------------------------------------------------- product_attribute_values
    await queryRunner.query(`
      CREATE TABLE "product_attribute_values" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "attribute_id" uuid NOT NULL REFERENCES "attributes"("id") ON DELETE CASCADE,
        "valor" jsonb NULL,
        "atualizado_em" timestamptz NOT NULL DEFAULT now(),
        "atualizado_por" uuid NULL REFERENCES "users"("id") ON DELETE SET NULL,
        UNIQUE ("product_id", "attribute_id")
      )`);

    // ---------------------------------------------------------------- product_variants
    await queryRunner.query(`
      CREATE TABLE "product_variants" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "sku" varchar(120) NOT NULL UNIQUE,
        "ean_gtin" varchar(40) NULL,
        "combinacao" jsonb NOT NULL DEFAULT '{}',
        "peso_kg" numeric(12,4) NULL,
        "dimensoes" jsonb NULL,
        "status" varchar(20) NOT NULL DEFAULT 'ativo',
        "criado_em" timestamptz NOT NULL DEFAULT now(),
        "atualizado_em" timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_product_variants_product" ON "product_variants" ("product_id")`,
    );

    // ---------------------------------------------------------------- product_variant_attribute_values
    await queryRunner.query(`
      CREATE TABLE "product_variant_attribute_values" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "product_variant_id" uuid NOT NULL REFERENCES "product_variants"("id") ON DELETE CASCADE,
        "attribute_id" uuid NOT NULL REFERENCES "attributes"("id") ON DELETE CASCADE,
        "valor" jsonb NULL,
        "atualizado_em" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("product_variant_id", "attribute_id")
      )`);

    // ---------------------------------------------------------------- channels
    await queryRunner.query(`
      CREATE TABLE "channels" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "nome" varchar(255) NOT NULL,
        "tipo" varchar(30) NOT NULL DEFAULT 'site_proprio',
        "criado_em" timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_channels_organization" ON "channels" ("organization_id")`,
    );

    // ---------------------------------------------------------------- prices
    await queryRunner.query(`
      CREATE TABLE "prices" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "product_variant_id" uuid NOT NULL REFERENCES "product_variants"("id") ON DELETE CASCADE,
        "channel_id" uuid NOT NULL REFERENCES "channels"("id") ON DELETE CASCADE,
        "moeda" varchar(3) NOT NULL DEFAULT 'BRL',
        "valor" numeric(18,2) NOT NULL,
        "valor_promocional" numeric(18,2) NULL,
        "promocao_inicio" timestamptz NULL,
        "promocao_fim" timestamptz NULL,
        UNIQUE ("product_variant_id", "channel_id", "moeda")
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_prices_variant" ON "prices" ("product_variant_id")`,
    );

    // ---------------------------------------------------------------- warehouses
    await queryRunner.query(`
      CREATE TABLE "warehouses" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "nome" varchar(255) NOT NULL,
        "endereco" jsonb NULL,
        "criado_em" timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_warehouses_organization" ON "warehouses" ("organization_id")`,
    );

    // ---------------------------------------------------------------- stock_items
    await queryRunner.query(`
      CREATE TABLE "stock_items" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "product_variant_id" uuid NOT NULL REFERENCES "product_variants"("id") ON DELETE CASCADE,
        "warehouse_id" uuid NOT NULL REFERENCES "warehouses"("id") ON DELETE CASCADE,
        "quantidade" int NOT NULL DEFAULT 0,
        "reservado" int NOT NULL DEFAULT 0,
        "atualizado_em" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("product_variant_id", "warehouse_id")
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_stock_items_variant" ON "stock_items" ("product_variant_id")`,
    );

    // ---------------------------------------------------------------- product_images
    await queryRunner.query(`
      CREATE TABLE "product_images" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "product_id" uuid NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "product_variant_id" uuid NULL REFERENCES "product_variants"("id") ON DELETE CASCADE,
        "url" varchar(1024) NOT NULL,
        "ordem" int NOT NULL DEFAULT 0,
        "alt_text" varchar(255) NULL
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_product_images_product" ON "product_images" ("product_id")`,
    );

    // ---------------------------------------------------------------- tags / product_tags
    await queryRunner.query(`
      CREATE TABLE "tags" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "nome" varchar(120) NOT NULL,
        UNIQUE ("organization_id", "nome")
      )`);
    await queryRunner.query(`
      CREATE TABLE "product_tags" (
        "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "tag_id" uuid NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
        PRIMARY KEY ("product_id", "tag_id")
      )`);

    // ---------------------------------------------------------------- integrations
    await queryRunner.query(`
      CREATE TABLE "integrations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "tipo" varchar(30) NOT NULL,
        "nome" varchar(255) NOT NULL,
        "credenciais" jsonb NULL,
        "status" varchar(20) NOT NULL DEFAULT 'ativa',
        "configuracao" jsonb NOT NULL DEFAULT '{}',
        "criado_em" timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_integrations_organization" ON "integrations" ("organization_id")`,
    );

    // ---------------------------------------------------------------- sync_logs
    await queryRunner.query(`
      CREATE TABLE "sync_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "integration_id" uuid NOT NULL REFERENCES "integrations"("id") ON DELETE CASCADE,
        "iniciado_em" timestamptz NOT NULL DEFAULT now(),
        "finalizado_em" timestamptz NULL,
        "status" varchar(20) NOT NULL DEFAULT 'erro',
        "itens_processados" int NOT NULL DEFAULT 0,
        "itens_com_erro" int NOT NULL DEFAULT 0,
        "detalhes" jsonb NULL
      )`);

    // ---------------------------------------------------------------- webhooks / webhook_deliveries
    await queryRunner.query(`
      CREATE TABLE "webhooks" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "url_destino" varchar(1024) NOT NULL,
        "eventos" text[] NOT NULL DEFAULT '{}',
        "segredo" varchar(255) NULL,
        "status" varchar(20) NOT NULL DEFAULT 'ativo',
        "criado_em" timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_webhooks_organization" ON "webhooks" ("organization_id")`,
    );
    await queryRunner.query(`
      CREATE TABLE "webhook_deliveries" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "webhook_id" uuid NOT NULL REFERENCES "webhooks"("id") ON DELETE CASCADE,
        "evento" varchar(60) NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}',
        "status_http_resposta" int NULL,
        "tentativas" int NOT NULL DEFAULT 0,
        "enviado_em" timestamptz NULL
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_webhook_deliveries_webhook" ON "webhook_deliveries" ("webhook_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'webhook_deliveries',
      'webhooks',
      'sync_logs',
      'integrations',
      'product_tags',
      'tags',
      'product_images',
      'stock_items',
      'warehouses',
      'prices',
      'channels',
      'product_variant_attribute_values',
      'product_variants',
      'product_attribute_values',
      'products',
      'suppliers',
      'category_attributes',
      'attribute_options',
      'attribute_validation_rules',
      'attributes',
      'attribute_groups',
      'categories',
      'api_keys',
      'users',
      'organizations',
    ];
    for (const t of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${t}"`);
    }
  }
}