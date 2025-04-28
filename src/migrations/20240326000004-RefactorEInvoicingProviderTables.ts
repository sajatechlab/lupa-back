import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorEInvoicingProviderTables20240326000004
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old world_office table if it exists
    await queryRunner.query(`
      DROP TABLE IF EXISTS "world_office";
    `);

    await queryRunner.query(`
      CREATE TYPE "e_invoice_provider_enum" AS ENUM ('WORLD_OFFICE', 'SIIGO');
    `);

    await queryRunner.query(`
      CREATE TABLE "e_invoice_provider" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "companyName" varchar,
        "prefix" varchar,
        "documentType" varchar,
        "companyId" uuid NOT NULL,
        "username" varchar,
        "accessKey" varchar,
        "provider" "e_invoice_provider_enum",
        CONSTRAINT "FK_einvoice_provider_company" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE
      );
    `);

    // Remove the provider column from company if it exists
    // (This is safe even if the column doesn't exist)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='company' AND column_name='provider'
        ) THEN
          ALTER TABLE "company" DROP COLUMN "provider";
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add the provider column back to company (as varchar, adjust if needed)
    await queryRunner.query(`
      ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "provider" varchar;
    `);

    // Drop the new table and type
    await queryRunner.query(`
      DROP TABLE IF EXISTS "e_invoice_provider";
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "e_invoice_provider_enum";
    `);

    // Optionally, recreate the world_office table (structure as before, adjust as needed)
    await queryRunner.query(`
      CREATE TABLE "world_office" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "companyName" varchar,
        "prefix" varchar,
        "documentType" varchar,
        "companyId" uuid NOT NULL,
        CONSTRAINT "FK_world_office_company" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE
      );
    `);
  }
}
