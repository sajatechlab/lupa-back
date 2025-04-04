import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSiigoTokenWithCompany1710000000004
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, drop the existing table
    await queryRunner.query(`DROP TABLE IF EXISTS "siigo_token"`);

    // Create the new table with company relation
    await queryRunner.query(`
      CREATE TABLE "siigo_token" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "accessToken" character varying NOT NULL,
        "tokenExpiration" bigint NOT NULL,
        "companyId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_siigo_token" PRIMARY KEY ("id"),
        CONSTRAINT "FK_siigo_token_company" FOREIGN KEY ("companyId") 
          REFERENCES "company"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "siigo_token"`);
  }
}
