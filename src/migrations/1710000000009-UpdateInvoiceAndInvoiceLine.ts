import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateInvoiceAndInvoiceLine1710000000009
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns
    await queryRunner.query(`
      ALTER TABLE "invoice_line"
      ADD COLUMN "taxAmountSecondary" numeric(20,6),
      ADD COLUMN "taxPercentSecondary" numeric(20,6),
      ADD COLUMN "taxSchemeNameSecondary" varchar;
    `);

    // Remove unused columns
    await queryRunner.query(`
      ALTER TABLE "invoice_line"
      DROP COLUMN "taxableAmount"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore removed columns
    await queryRunner.query(`
      ALTER TABLE "invoice_line"
      ADD COLUMN "taxableAmount" numeric(20,6)
    `);

    // Remove new columns
    await queryRunner.query(`
      ALTER TABLE "invoice_line"
      DROP COLUMN "taxAmountSecondary",
      DROP COLUMN "taxPercentSecondary",
      DROP COLUMN "taxSchemeNameSecondary";
    `);
  }
}
