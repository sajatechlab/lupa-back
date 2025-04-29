import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorEInvoicingProviderTables1710000000012
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the new enum
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the new enum
    await queryRunner.query(`
      DROP TYPE IF EXISTS "e_invoice_provider_enum";
    `);
  }
}
