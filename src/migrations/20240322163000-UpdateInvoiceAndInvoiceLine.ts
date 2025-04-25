import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateInvoiceAndInvoiceLine20240322163000
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
      DROP COLUMN "taxableAmount",
      DROP COLUMN "taxableAmountCurrencyId",
      DROP COLUMN "taxAmountCurrencyId",
      DROP COLUMN "taxSchemeId";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore removed columns
    await queryRunner.query(`
      ALTER TABLE "invoice_line"
      ADD COLUMN "taxableAmount" numeric(20,6),
      ADD COLUMN "taxableAmountCurrencyId" varchar,
      ADD COLUMN "taxAmountCurrencyId" varchar,
      ADD COLUMN "taxSchemeId" varchar;
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
