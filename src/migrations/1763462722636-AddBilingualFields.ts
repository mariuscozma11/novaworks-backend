import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBilingualFields1763462722636 implements MigrationInterface {
  name = 'AddBilingualFields1763462722636';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "name"`);
    await queryRunner.query(
      `ALTER TABLE "categories" DROP COLUMN "description"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "name"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "description"`);
    await queryRunner.query(
      `ALTER TABLE "categories" ADD "nameEn" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD "nameRo" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD "descriptionEn" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD "descriptionRo" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "nameEn" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "nameRo" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "descriptionEn" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "descriptionRo" text NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN "descriptionRo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN "descriptionEn"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "nameRo"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "nameEn"`);
    await queryRunner.query(
      `ALTER TABLE "categories" DROP COLUMN "descriptionRo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP COLUMN "descriptionEn"`,
    );
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "nameRo"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "nameEn"`);
    await queryRunner.query(
      `ALTER TABLE "products" ADD "description" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "name" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "categories" ADD "description" text`);
    await queryRunner.query(
      `ALTER TABLE "categories" ADD "name" character varying NOT NULL`,
    );
  }
}
