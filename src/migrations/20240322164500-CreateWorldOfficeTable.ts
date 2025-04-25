import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorldOfficeTable20240322164500
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First create the enum type
    await queryRunner.query(`
      CREATE TYPE "e_invoice_provider" AS ENUM ('WORLD_OFFICE', 'SIIGO');
    `);

    // Add provider column to company table
    await queryRunner.query(`
      ALTER TABLE "company"
      ADD COLUMN "provider" "e_invoice_provider";
    `);

    // Create world_office table
    await queryRunner.query(`
      CREATE TABLE "world_office" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "companyName" varchar NOT NULL,
        "prefix" varchar NOT NULL,
        "documentType" varchar NOT NULL,
        "companyId" uuid NOT NULL,
        CONSTRAINT "fk_world_office_company" FOREIGN KEY ("companyId") 
          REFERENCES "company" ("id") ON DELETE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop world_office table
    await queryRunner.query(`
      DROP TABLE "world_office";
    `);

    // Remove provider column from company
    await queryRunner.query(`
      ALTER TABLE "company"
      DROP COLUMN "provider";
    `);

    // Drop the enum type
    await queryRunner.query(`
      DROP TYPE "e_invoice_provider";
    `);
  }
}
