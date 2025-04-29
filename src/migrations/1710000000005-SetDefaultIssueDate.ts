import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetDefaultIssueDate1710000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE invoice 
      SET "issueDate" = NOW() 
      WHERE "issueDate" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No down migration needed
  }
}
