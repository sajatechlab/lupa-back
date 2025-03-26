import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFileNameToInvoice1710000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "invoice"
      ADD COLUMN "fileName" VARCHAR
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "invoice"
      DROP COLUMN "fileName"
    `);
  }
}
