import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyFields1711467937123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "document_type_enum" AS ENUM ('cedula_ciudadania', 'pasaporte')
    `);

    await queryRunner.query(`
      ALTER TABLE "company"
      ADD COLUMN "legalRepDocumentNumber" character varying,
      ADD COLUMN "legalRepDocumentType" document_type_enum
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "company"
      DROP COLUMN "legalRepDocumentNumber",
      DROP COLUMN "legalRepDocumentType"
    `);

    await queryRunner.query(`
      DROP TYPE "document_type_enum"
    `);
  }
}
