import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsPostedToInvoice1710000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "invoice"
      ADD COLUMN "isPosted" BOOLEAN NOT NULL DEFAULT FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "invoice"
      DROP COLUMN "isPosted"
    `);
  }
}
