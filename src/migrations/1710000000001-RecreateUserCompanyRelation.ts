import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecreateUserCompanyRelation1710000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old table if exists
    await queryRunner.query(
      `DROP TABLE IF EXISTS "user_companies_company" CASCADE`,
    );

    // Create new junction table
    await queryRunner.query(`
            CREATE TABLE "user_companies" (
                "user_id" INTEGER NOT NULL,
                "company_id" UUID NOT NULL,
                CONSTRAINT "PK_user_companies" PRIMARY KEY ("user_id", "company_id"),
                CONSTRAINT "FK_user_companies_user" FOREIGN KEY ("user_id") 
                    REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "FK_user_companies_company" FOREIGN KEY ("company_id") 
                    REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `);

    // Create indexes
    await queryRunner.query(`
            CREATE INDEX "IDX_user_companies_user_id" ON "user_companies"("user_id");
            CREATE INDEX "IDX_user_companies_company_id" ON "user_companies"("company_id");
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_companies" CASCADE`);
  }
}
