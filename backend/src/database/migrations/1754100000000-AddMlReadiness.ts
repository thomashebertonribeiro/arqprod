import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMlReadiness1754100000000 implements MigrationInterface {
  name = 'AddMlReadiness1754100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "ml_readiness_score" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "ml_listings_count" integer NOT NULL DEFAULT 0`,
    );

    await queryRunner.query(
      `INSERT INTO arqprod_migrations (timestamp, name) VALUES (1754100000000, 'AddMlReadiness1754100000000') ON CONFLICT DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "ml_listings_count"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "ml_readiness_score"`);
  }
}
