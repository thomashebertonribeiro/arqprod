import { MigrationInterface, QueryRunner } from 'typeorm';

export class MlMonitor1754000000000 implements MigrationInterface {
  name = 'MlMonitor1754000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "ml_listings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "product_variant_id" uuid NOT NULL,
        "ml_item_id" varchar(30),
        "ml_permalink" text,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "moeda" varchar(3) NOT NULL DEFAULT 'BRL',
        "preco" numeric(18,2) NOT NULL DEFAULT 0,
        "preco_promocional" numeric(18,2),
        "quantidade" integer NOT NULL DEFAULT 1,
        "title" varchar(60),
        "description" text,
        "category_mlb" varchar(30),
        "condition" varchar(20) NOT NULL DEFAULT 'new',
        "attributes" jsonb NOT NULL DEFAULT '[]',
        "pictures" jsonb NOT NULL DEFAULT '[]',
        "shipping" jsonb NOT NULL DEFAULT '{}',
        "seller_id" varchar(30),
        "last_sync_at" timestamptz,
        "last_error" text,
        "ml_created_at" timestamptz,
        "ml_updated_at" timestamptz,
        "criado_em" TIMESTAMP NOT NULL DEFAULT now(),
        "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ml_listings" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `DO $$ BEGIN
        ALTER TABLE "ml_listings" ADD CONSTRAINT "FK_ml_listing_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$`,
    );

    await queryRunner.query(
      `DO $$ BEGIN
        ALTER TABLE "ml_listings" ADD CONSTRAINT "FK_ml_listing_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$`,
    );

    await queryRunner.query(
      `DO $$ BEGIN
        ALTER TABLE "ml_listings" ADD CONSTRAINT "FK_ml_listing_variant" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ml_listings_org" ON "ml_listings" ("organization_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ml_listings_product" ON "ml_listings" ("product_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ml_listings_status" ON "ml_listings" ("status")`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ml_listing_variant_ml" ON "ml_listings" ("product_variant_id", "ml_item_id") WHERE "ml_item_id" IS NOT NULL`,
    );

    await queryRunner.query(
      `INSERT INTO arqprod_migrations (timestamp, name) VALUES (1754000000000, 'MlMonitor1754000000000') ON CONFLICT DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ml_listings"`);
  }
}
