import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductFiscalFields1750000000000 implements MigrationInterface {
  name = 'AddProductFiscalFields1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN "ean_gtin" varchar(40) NULL`,
    );
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "ncm" varchar(12) NULL`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "cest" varchar(10) NULL`);
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN "custo" numeric(12,2) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "custo"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "cest"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "ncm"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "ean_gtin"`);
  }
}