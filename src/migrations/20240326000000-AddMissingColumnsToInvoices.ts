import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingColumnsToInvoices20240326000000
  implements MigrationInterface
{
  name = 'AddMissingColumnsToInvoices20240326000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add prefix to invoice table
    await queryRunner.query(`
            ALTER TABLE "invoice" 
            ADD COLUMN IF NOT EXISTS "prefix" character varying;
        `);
    await queryRunner.query(`
            ALTER TABLE "invoice" 
            ADD COLUMN IF NOT EXISTS "paymentMethod" integer;
          `);
    // Add discount to invoice_line table
    await queryRunner.query(`
            ALTER TABLE "invoice_line" 
            ADD COLUMN IF NOT EXISTS "discount" numeric(20,6);
        `);

    // Add comment to explain what each column represents
    await queryRunner.query(`
            COMMENT ON COLUMN "invoice"."prefix" IS 'The prefix from DIAN extensions (e.g., FE, E)';
            COMMENT ON COLUMN "invoice"."paymentMethod" IS 'The payment means ID from the invoice';
            COMMENT ON COLUMN "invoice_line"."discount" IS 'The discount amount when ChargeIndicator is false in AllowanceCharge';
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove comments first
    await queryRunner.query(`
            COMMENT ON COLUMN "invoice"."prefix" IS NULL;
            COMMENT ON COLUMN "invoice"."paymentMethod" IS NULL;
            COMMENT ON COLUMN "invoice_line"."discount" IS NULL;
        `);

    // Remove columns
    await queryRunner.query(`
            ALTER TABLE "invoice_line" DROP COLUMN IF EXISTS "discount";
        `);

    await queryRunner.query(`
            ALTER TABLE "invoice" DROP COLUMN IF EXISTS "paymentMethod";
        `);

    await queryRunner.query(`
            ALTER TABLE "invoice" DROP COLUMN IF EXISTS "prefix";
        `);
  }
}
