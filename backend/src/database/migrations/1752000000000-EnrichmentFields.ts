import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnrichmentFields1752000000000 implements MigrationInterface {
  name = 'EnrichmentFields1752000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "brands" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "nome" character varying(255) NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_brands" PRIMARY KEY ("id"), CONSTRAINT "UQ_brand_org_nome" UNIQUE ("organization_id", "nome"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "brands" ADD CONSTRAINT "FK_brand_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "manufacturers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "nome" character varying(255) NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_manufacturers" PRIMARY KEY ("id"), CONSTRAINT "UQ_manufacturer_org_nome" UNIQUE ("organization_id", "nome"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "manufacturers" ADD CONSTRAINT "FK_manufacturer_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "product_audits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "user_id" uuid, "acao" character varying(40) NOT NULL, "detalhes" jsonb, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_product_audits" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_product_audits_product" ON "product_audits" ("product_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_audits" ADD CONSTRAINT "FK_audit_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_audits" ADD CONSTRAINT "FK_audit_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "brand_id" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "manufacturer_id" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "criado_por" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "atualizado_por" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "peso_bruto_kg" numeric(12,4) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "peso_liquido_kg" numeric(12,4) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "altura_cm" numeric(10,2) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "largura_cm" numeric(10,2) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "profundidade_cm" numeric(10,2) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unidade_venda" character varying(20) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "data_lancamento" TIMESTAMP WITH TIME ZONE NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_product_brand" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_product_manufacturer" FOREIGN KEY ("manufacturer_id") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_product_criado_por" FOREIGN KEY ("criado_por") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_product_atualizado_por" FOREIGN KEY ("atualizado_por") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_product_atualizado_por"`);
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_product_criado_por"`);
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_product_manufacturer"`);
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_product_brand"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "data_lancamento"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "unidade_venda"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "profundidade_cm"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "largura_cm"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "altura_cm"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "peso_liquido_kg"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "peso_bruto_kg"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "atualizado_por"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "criado_por"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "manufacturer_id"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "brand_id"`);
    await queryRunner.query(`DROP TABLE "product_audits"`);
    await queryRunner.query(`DROP TABLE "manufacturers"`);
    await queryRunner.query(`DROP TABLE "brands"`);
  }
}